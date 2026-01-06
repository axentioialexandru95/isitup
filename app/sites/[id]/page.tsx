import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, and, desc, gte } from "drizzle-orm";
import Link from "next/link";
import { SiteDetailClient } from "./client";
import { getCheckHistoryPaginated } from "@/lib/actions/checks";

async function getSiteWithChartData(siteId: string, userId: string, timeframe: "24h" | "7d" | "30d" = "24h") {
  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, userId)
    ),
  });

  if (!site) return null;

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

  // Get all checks for chart and stats (limited to reasonable amount)
  const allChecks = await db.query.checks.findMany({
    where: and(
      eq(schema.checks.siteId, siteId),
      gte(schema.checks.timestamp, since)
    ),
    orderBy: [desc(schema.checks.timestamp)],
    limit: 500, // Limit for chart data
  });

  return { site, allChecks };
}

export default async function SiteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ timeframe?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const { timeframe = "24h", page: pageParam } = await searchParams;
  const validTimeframe = ["24h", "7d", "30d"].includes(timeframe)
    ? (timeframe as "24h" | "7d" | "30d")
    : "24h";
  const page = Math.max(1, parseInt(pageParam || "1", 10));

  const [data, paginatedChecks] = await Promise.all([
    getSiteWithChartData(id, session.user.id, validTimeframe),
    getCheckHistoryPaginated(id, validTimeframe, page, 20),
  ]);

  if (!data) {
    notFound();
  }

  const { site, allChecks } = data;

  // Calculate stats from all checks
  const upCount = allChecks.filter((c) => c.status === "up").length;
  const uptimePercent = allChecks.length > 0 ? Math.round((upCount / allChecks.length) * 100) : null;

  const withResponseTime = allChecks.filter((c) => c.responseTimeMs !== null);
  const avgResponseTime =
    withResponseTime.length > 0
      ? Math.round(
          withResponseTime.reduce((acc, c) => acc + (c.responseTimeMs ?? 0), 0) /
            withResponseTime.length
        )
      : null;

  const latestCheck = allChecks[0] ?? null;

  // Prepare chart data (reverse to show oldest first, sample if too many)
  let chartChecks = [...allChecks].reverse();
  if (chartChecks.length > 100) {
    // Sample to ~100 points for chart
    const step = Math.ceil(chartChecks.length / 100);
    chartChecks = chartChecks.filter((_, i) => i % step === 0);
  }

  const chartData = chartChecks.map((c) => ({
    timestamp: c.timestamp.toISOString(),
    responseTime: c.responseTimeMs,
    status: c.status,
  }));

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-6xl mx-auto mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {site.name}
            </h1>
            <p className="text-text-secondary mt-1">{site.url}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/sites/${site.id}/edit`}
              className="px-4 py-2 border border-border text-text-secondary rounded-lg transition-colors hover:border-text-muted hover:text-text-primary text-sm"
            >
              Edit
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <SiteDetailClient
          siteId={site.id}
          siteName={site.name}
          siteUrl={site.url}
          latestCheck={latestCheck ? {
            status: latestCheck.status,
            timestamp: latestCheck.timestamp.toISOString(),
            httpStatus: latestCheck.httpStatus,
            responseTimeMs: latestCheck.responseTimeMs,
            sslValid: latestCheck.sslValid,
            sslExpiresAt: latestCheck.sslExpiresAt?.toISOString() ?? null,
            dnsResolved: latestCheck.dnsResolved,
            contentFound: latestCheck.contentFound,
            errorMessage: latestCheck.errorMessage,
          } : null}
          uptimePercent={uptimePercent}
          avgResponseTime={avgResponseTime}
          chartData={chartData}
          checks={paginatedChecks.checks.map(c => ({
            id: c.id,
            timestamp: c.timestamp.toISOString(),
            status: c.status,
            httpStatus: c.httpStatus,
            responseTimeMs: c.responseTimeMs,
            errorMessage: c.errorMessage,
          }))}
          timeframe={validTimeframe}
          pagination={{
            page: paginatedChecks.page,
            totalPages: paginatedChecks.totalPages,
            total: paginatedChecks.total,
          }}
        />
      </main>
    </div>
  );
}
