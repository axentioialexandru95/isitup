"use server";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { eq, and, gte, count, avg, sql } from "drizzle-orm";

export async function getDashboardAnalytics() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  // Get all user's sites
  const sites = await db.query.sites.findMany({
    where: eq(schema.sites.userId, userId),
  });

  if (sites.length === 0) {
    return null;
  }

  const siteIds = sites.map((s) => s.id);
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get checks from last 24h for all sites
  const checks24h = await db.query.checks.findMany({
    where: and(
      sql`${schema.checks.siteId} IN ${siteIds}`,
      gte(schema.checks.timestamp, last24h)
    ),
  });

  // Get checks from last 7d for trend
  const checks7d = await db.query.checks.findMany({
    where: and(
      sql`${schema.checks.siteId} IN ${siteIds}`,
      gte(schema.checks.timestamp, last7d)
    ),
  });

  // Calculate stats
  const totalSites = sites.length;
  const enabledSites = sites.filter((s) => s.enabled).length;

  // Current status counts
  const latestChecksBySite = new Map<string, typeof checks24h[0]>();
  for (const check of checks24h) {
    const existing = latestChecksBySite.get(check.siteId);
    if (!existing || check.timestamp > existing.timestamp) {
      latestChecksBySite.set(check.siteId, check);
    }
  }

  let sitesUp = 0;
  let sitesDown = 0;
  let sitesDegraded = 0;

  for (const check of latestChecksBySite.values()) {
    if (check.status === "up") sitesUp++;
    else if (check.status === "down") sitesDown++;
    else if (check.status === "degraded") sitesDegraded++;
  }

  // Overall uptime (24h)
  const upChecks24h = checks24h.filter((c) => c.status === "up").length;
  const overallUptime24h = checks24h.length > 0
    ? Math.round((upChecks24h / checks24h.length) * 100)
    : null;

  // Average response time (24h)
  const withResponseTime = checks24h.filter((c) => c.responseTimeMs !== null);
  const avgResponseTime = withResponseTime.length > 0
    ? Math.round(
        withResponseTime.reduce((acc, c) => acc + (c.responseTimeMs ?? 0), 0) /
          withResponseTime.length
      )
    : null;

  // Total checks (24h)
  const totalChecks24h = checks24h.length;

  // Incidents (status changes to down) in last 24h
  const incidents24h = checks24h.filter((c) => c.status === "down").length;

  // Response time trend (hourly averages for last 24h)
  const hourlyData: { hour: string; avgResponseTime: number; uptime: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);

    const hourChecks = checks24h.filter(
      (c) => c.timestamp >= hourStart && c.timestamp < hourEnd
    );

    const hourWithResponse = hourChecks.filter((c) => c.responseTimeMs !== null);
    const hourAvg = hourWithResponse.length > 0
      ? Math.round(
          hourWithResponse.reduce((acc, c) => acc + (c.responseTimeMs ?? 0), 0) /
            hourWithResponse.length
        )
      : 0;

    const hourUp = hourChecks.filter((c) => c.status === "up").length;
    const hourUptime = hourChecks.length > 0
      ? Math.round((hourUp / hourChecks.length) * 100)
      : 100;

    hourlyData.push({
      hour: hourEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avgResponseTime: hourAvg,
      uptime: hourUptime,
    });
  }

  return {
    totalSites,
    enabledSites,
    sitesUp,
    sitesDown,
    sitesDegraded,
    overallUptime24h,
    avgResponseTime,
    totalChecks24h,
    incidents24h,
    hourlyData,
  };
}
