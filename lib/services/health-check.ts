import { db, schema } from "@/lib/db";
import type { Site, NewCheck } from "@/lib/db/schema";
import * as dns from "dns/promises";
import * as tls from "tls";
import { eq, and, lt } from "drizzle-orm";

export type CheckResult = {
  status: "up" | "down" | "degraded";
  httpStatus: number | null;
  responseTimeMs: number | null;
  sslValid: boolean | null;
  sslExpiresAt: Date | null;
  dnsResolved: boolean;
  contentFound: boolean | null;
  errorMessage: string | null;
};

const TIMEOUT_MS = 30000;
const SLOW_THRESHOLD_MS = 3000;
const SSL_WARNING_DAYS = 14;

async function checkDns(hostname: string): Promise<boolean> {
  try {
    await dns.lookup(hostname);
    return true;
  } catch {
    return false;
  }
}

async function checkSsl(
  hostname: string
): Promise<{ valid: boolean; expiresAt: Date | null }> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        timeout: 10000,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          resolve({ valid: false, expiresAt: null });
          return;
        }

        const expiresAt = new Date(cert.valid_to);
        const isValid = expiresAt > new Date();
        resolve({ valid: isValid, expiresAt });
      }
    );

    socket.on("error", () => {
      socket.destroy();
      resolve({ valid: false, expiresAt: null });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ valid: false, expiresAt: null });
    });
  });
}

async function checkHttp(
  url: string
): Promise<{
  status: number | null;
  responseTimeMs: number;
  body: string | null;
  error: string | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "IsItUp/1.0 (Uptime Monitor)",
      },
    });

    const responseTimeMs = Date.now() - start;
    const body = await response.text();

    clearTimeout(timeout);
    return {
      status: response.status,
      responseTimeMs,
      body,
      error: null,
    };
  } catch (err) {
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;
    return {
      status: null,
      responseTimeMs,
      body: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function checkContent(body: string | null, searchText: string): boolean {
  if (!body) return false;
  return body.includes(searchText);
}

export async function performCheck(site: Site): Promise<CheckResult> {
  const url = new URL(site.url);
  const hostname = url.hostname;
  const isHttps = url.protocol === "https:";

  // 1. DNS Check
  const dnsResolved = await checkDns(hostname);
  if (!dnsResolved) {
    return {
      status: "down",
      httpStatus: null,
      responseTimeMs: null,
      sslValid: null,
      sslExpiresAt: null,
      dnsResolved: false,
      contentFound: null,
      errorMessage: "DNS resolution failed",
    };
  }

  // 2. HTTP Check
  const httpResult = await checkHttp(site.url);
  if (httpResult.error) {
    return {
      status: "down",
      httpStatus: null,
      responseTimeMs: httpResult.responseTimeMs,
      sslValid: null,
      sslExpiresAt: null,
      dnsResolved: true,
      contentFound: null,
      errorMessage: httpResult.error,
    };
  }

  // 3. SSL Check (if HTTPS and enabled)
  let sslValid: boolean | null = null;
  let sslExpiresAt: Date | null = null;

  if (isHttps && site.checkSsl) {
    const sslResult = await checkSsl(hostname);
    sslValid = sslResult.valid;
    sslExpiresAt = sslResult.expiresAt;
  }

  // 4. Content Check (if configured)
  let contentFound: boolean | null = null;
  if (site.checkContent) {
    contentFound = checkContent(httpResult.body, site.checkContent);
  }

  // Determine status
  const isHttpOk =
    httpResult.status !== null &&
    httpResult.status >= 200 &&
    httpResult.status < 400;
  const isSlow = httpResult.responseTimeMs > SLOW_THRESHOLD_MS;
  const isSslExpiringSoon =
    sslExpiresAt &&
    sslExpiresAt.getTime() - Date.now() < SSL_WARNING_DAYS * 24 * 60 * 60 * 1000;
  const isContentMissing = site.checkContent && !contentFound;
  const isSslInvalid = site.checkSsl && isHttps && sslValid === false;

  let status: "up" | "down" | "degraded";
  let errorMessage: string | null = null;

  if (!isHttpOk || isSslInvalid) {
    status = "down";
    if (!isHttpOk) {
      errorMessage = `HTTP ${httpResult.status}`;
    } else if (isSslInvalid) {
      errorMessage = "SSL certificate invalid";
    }
  } else if (isSlow || isSslExpiringSoon || isContentMissing) {
    status = "degraded";
    if (isSlow) {
      errorMessage = "Response time > 3s";
    } else if (isSslExpiringSoon) {
      errorMessage = "SSL certificate expiring soon";
    } else if (isContentMissing) {
      errorMessage = "Expected content not found";
    }
  } else {
    status = "up";
  }

  return {
    status,
    httpStatus: httpResult.status,
    responseTimeMs: httpResult.responseTimeMs,
    sslValid,
    sslExpiresAt,
    dnsResolved: true,
    contentFound,
    errorMessage,
  };
}

export async function saveCheckResult(
  siteId: string,
  result: CheckResult
): Promise<void> {
  const check: NewCheck = {
    id: crypto.randomUUID(),
    siteId,
    status: result.status,
    httpStatus: result.httpStatus,
    responseTimeMs: result.responseTimeMs,
    sslValid: result.sslValid,
    sslExpiresAt: result.sslExpiresAt,
    dnsResolved: result.dnsResolved,
    contentFound: result.contentFound,
    errorMessage: result.errorMessage,
  };

  await db.insert(schema.checks).values(check);
}

export async function getLatestCheckForSite(siteId: string) {
  return db.query.checks.findFirst({
    where: eq(schema.checks.siteId, siteId),
    orderBy: (checks, { desc }) => [desc(checks.timestamp)],
  });
}

export async function cleanupOldChecks(retentionDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  await db
    .delete(schema.checks)
    .where(lt(schema.checks.timestamp, cutoffDate));
}
