"use server";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { performCheck, saveCheckResult, getLatestCheckForSite } from "@/lib/services/health-check";
import { sendDiscordNotification } from "@/lib/services/discord";

export async function triggerCheck(siteId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Get site and verify ownership
  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) {
    throw new Error("Site not found");
  }

  // Get previous check for status comparison
  const previousCheck = await getLatestCheckForSite(siteId);
  const previousStatus = previousCheck?.status ?? null;

  // Perform the check
  const result = await performCheck(site);

  // Save the result
  await saveCheckResult(siteId, result);

  // Get user for discord webhook
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
  });

  // Send notification if status changed
  if (user?.discordWebhookUrl && previousStatus !== result.status) {
    const newCheck = await getLatestCheckForSite(siteId);
    if (newCheck) {
      await sendDiscordNotification(
        user.discordWebhookUrl,
        site,
        newCheck,
        previousStatus
      );
    }
  }

  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/dashboard");

  return result;
}

export async function getCheckHistory(
  siteId: string,
  timeframe: "24h" | "7d" | "30d" = "24h"
) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  // Verify ownership
  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) {
    return [];
  }

  const now = new Date();
  let since: Date;

  switch (timeframe) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return db.query.checks.findMany({
    where: and(
      eq(schema.checks.siteId, siteId),
      gte(schema.checks.timestamp, since)
    ),
    orderBy: [desc(schema.checks.timestamp)],
  });
}

export async function getUptimePercentage(
  siteId: string,
  timeframe: "24h" | "7d" | "30d" = "24h"
) {
  const checks = await getCheckHistory(siteId, timeframe);

  if (checks.length === 0) {
    return null;
  }

  const upCount = checks.filter((c) => c.status === "up").length;
  return Math.round((upCount / checks.length) * 100);
}

export async function getAverageResponseTime(
  siteId: string,
  timeframe: "24h" | "7d" | "30d" = "24h"
) {
  const checks = await getCheckHistory(siteId, timeframe);

  const withResponseTime = checks.filter((c) => c.responseTimeMs !== null);
  if (withResponseTime.length === 0) {
    return null;
  }

  const sum = withResponseTime.reduce((acc, c) => acc + (c.responseTimeMs ?? 0), 0);
  return Math.round(sum / withResponseTime.length);
}

export async function getCheckHistoryPaginated(
  siteId: string,
  timeframe: "24h" | "7d" | "30d" = "24h",
  page: number = 1,
  pageSize: number = 20
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { checks: [], total: 0, page, pageSize, totalPages: 0 };
  }

  // Verify ownership
  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) {
    return { checks: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const now = new Date();
  let since: Date;

  switch (timeframe) {
    case "24h":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const offset = (page - 1) * pageSize;

  const [checks, totalResult] = await Promise.all([
    db.query.checks.findMany({
      where: and(
        eq(schema.checks.siteId, siteId),
        gte(schema.checks.timestamp, since)
      ),
      orderBy: [desc(schema.checks.timestamp)],
      limit: pageSize,
      offset,
    }),
    db
      .select({ count: count() })
      .from(schema.checks)
      .where(
        and(
          eq(schema.checks.siteId, siteId),
          gte(schema.checks.timestamp, since)
        )
      ),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return { checks, total, page, pageSize, totalPages };
}
