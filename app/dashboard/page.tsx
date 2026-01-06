import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getUserSitesPaginated } from "@/lib/actions/sites";
import { getLatestCheckForSite } from "@/lib/services/health-check";
import { getUptimePercentage } from "@/lib/actions/checks";
import { getDashboardAnalytics } from "@/lib/actions/analytics";
import Link from "next/link";
import { AnalyticsChart } from "./analytics-chart";

function StatusBadge({ status }: { status: "up" | "down" | "degraded" | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-bg-tertiary text-text-muted">
        <span className="w-2 h-2 rounded-full bg-text-muted" />
        Unknown
      </span>
    );
  }

  const styles = {
    up: "bg-accent-glow text-accent",
    down: "bg-danger-glow text-danger",
    degraded: "bg-warning-glow text-warning",
  };

  const dotStyles = {
    up: "bg-accent",
    down: "bg-danger",
    degraded: "bg-warning",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dotStyles[status]} ${status === "up" ? "status-pulse" : ""}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

function Pagination({
  page,
  totalPages,
  baseUrl,
}: {
  page: number;
  totalPages: number;
  baseUrl: string;
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Link
        href={page > 1 ? `${baseUrl}?page=${page - 1}` : "#"}
        className={`px-3 py-2 rounded-lg text-sm ${
          page > 1
            ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            : "text-text-muted cursor-not-allowed"
        }`}
      >
        Previous
      </Link>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-2 text-text-muted">
            ...
          </span>
        ) : (
          <Link
            key={i}
            href={`${baseUrl}?page=${p}`}
            className={`px-3 py-2 rounded-lg text-sm ${
              p === page
                ? "bg-accent text-bg-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            }`}
          >
            {p}
          </Link>
        )
      )}
      <Link
        href={page < totalPages ? `${baseUrl}?page=${page + 1}` : "#"}
        className={`px-3 py-2 rounded-lg text-sm ${
          page < totalPages
            ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            : "text-text-muted cursor-not-allowed"
        }`}
      >
        Next
      </Link>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));

  const [{ sites, total, totalPages }, analytics] = await Promise.all([
    getUserSitesPaginated(page, 10),
    getDashboardAnalytics(),
  ]);

  // Get latest checks and uptime for each site
  const sitesWithStatus = await Promise.all(
    sites.map(async (site) => {
      const latestCheck = await getLatestCheckForSite(site.id);
      const uptime = await getUptimePercentage(site.id, "24h");
      return {
        ...site,
        latestCheck,
        uptime,
      };
    })
  );

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-accent status-pulse" />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            IsItUp
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            Settings
          </Link>
          <span className="text-text-muted">|</span>
          <span className="text-text-secondary text-sm">
            {session.user.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {/* Analytics Section */}
        {analytics && (
          <section>
            <h2
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Overview (24h)
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">Total Sites</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {analytics.totalSites}
                </p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">Sites Up</p>
                <p className="text-2xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>
                  {analytics.sitesUp}
                </p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">Sites Down</p>
                <p className="text-2xl font-bold text-danger" style={{ fontFamily: "var(--font-display)" }}>
                  {analytics.sitesDown}
                </p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">Overall Uptime</p>
                <p
                  className={`text-2xl font-bold ${
                    analytics.overallUptime24h === null
                      ? "text-text-muted"
                      : analytics.overallUptime24h >= 99
                      ? "text-accent"
                      : analytics.overallUptime24h >= 95
                      ? "text-warning"
                      : "text-danger"
                  }`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {analytics.overallUptime24h !== null ? `${analytics.overallUptime24h}%` : "—"}
                </p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">Avg Response</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {analytics.avgResponseTime !== null ? `${analytics.avgResponseTime}ms` : "—"}
                </p>
              </div>

              <div className="bg-bg-secondary border border-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">Total Checks</p>
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {analytics.totalChecks24h}
                </p>
              </div>
            </div>

            {/* Response Time Chart */}
            {analytics.hourlyData.length > 0 && (
              <div className="bg-bg-secondary border border-border rounded-xl p-6">
                <h3 className="text-sm font-medium text-text-secondary mb-4">
                  Response Time Trend (24h)
                </h3>
                <AnalyticsChart data={analytics.hourlyData} />
              </div>
            )}
          </section>
        )}

        {/* Sites Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your Sites
              {total > 0 && (
                <span className="text-text-muted font-normal text-sm ml-2">
                  ({total})
                </span>
              )}
            </h2>
            <Link
              href="/sites/new"
              className="px-4 py-2 bg-accent text-bg-primary font-medium rounded-lg transition-all duration-200 hover:bg-accent-hover text-sm"
            >
              Add Site
            </Link>
          </div>

          {sitesWithStatus.length === 0 && page === 1 ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
              <div className="text-text-muted mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No sites yet</h3>
              <p className="text-text-secondary text-sm mb-6">
                Add your first site to start monitoring its uptime.
              </p>
              <Link
                href="/sites/new"
                className="inline-flex px-4 py-2 bg-accent text-bg-primary font-medium rounded-lg transition-all duration-200 hover:bg-accent-hover text-sm"
              >
                Add your first site
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {sitesWithStatus.map((site) => (
                  <Link
                    key={site.id}
                    href={`/sites/${site.id}`}
                    className="block bg-bg-secondary border border-border rounded-xl p-6 transition-all duration-200 hover:border-text-muted group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                            {site.name}
                          </h3>
                          <p className="text-sm text-text-muted mt-0.5">
                            {site.url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {site.uptime !== null && (
                          <div className="text-right">
                            <p className="text-sm text-text-muted">Uptime (24h)</p>
                            <p
                              className={`text-lg font-semibold ${
                                site.uptime >= 99
                                  ? "text-accent"
                                  : site.uptime >= 95
                                  ? "text-warning"
                                  : "text-danger"
                              }`}
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {site.uptime}%
                            </p>
                          </div>
                        )}

                        {site.latestCheck && (
                          <div className="text-right">
                            <p className="text-sm text-text-muted">Response</p>
                            <p
                              className="text-lg font-semibold text-text-primary"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {site.latestCheck.responseTimeMs ?? "—"}
                              <span className="text-sm text-text-muted ml-0.5">ms</span>
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={site.latestCheck?.status ?? null} />
                          {site.latestCheck && (
                            <span className="text-xs text-text-muted">
                              {formatTimeAgo(site.latestCheck.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Pagination page={page} totalPages={totalPages} baseUrl="/dashboard" />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
