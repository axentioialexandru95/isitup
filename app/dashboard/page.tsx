import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { getUserSitesPaginated } from "@/lib/actions/sites";
import { getLatestCheckForSite } from "@/lib/services/health-check";
import { getUptimePercentage } from "@/lib/actions/checks";
import { getDashboardAnalytics } from "@/lib/actions/analytics";
import Link from "next/link";
import { AnalyticsChart } from "./analytics-chart";

function StatusIndicator({ status }: { status: "up" | "down" | "degraded" | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-bg-tertiary text-text-muted border border-border">
        <span className="w-2 h-2 rounded-full bg-text-muted" />
        <span className="uppercase tracking-wider">Unknown</span>
      </span>
    );
  }

  const config = {
    up: {
      bg: "status-up",
      dot: "bg-success",
      pulse: "status-pulse",
      label: "Operational",
    },
    down: {
      bg: "status-down",
      dot: "bg-danger",
      pulse: "status-pulse-danger",
      label: "Down",
    },
    degraded: {
      bg: "status-degraded",
      dot: "bg-warning",
      pulse: "",
      label: "Degraded",
    },
  };

  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} ${c.pulse}`} />
      <span className="uppercase tracking-wider">{c.label}</span>
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

function StatCard({
  label,
  value,
  suffix,
  color,
  delay,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  color?: "accent" | "danger" | "warning" | "default";
  delay?: string;
}) {
  const colorClasses = {
    accent: "text-accent",
    danger: "text-danger",
    warning: "text-warning",
    default: "text-text-primary",
  };

  return (
    <div
      className={`bg-bg-secondary border border-border rounded-lg p-5 opacity-0 animate-fade-in ${delay || ""}`}
      style={{ animationFillMode: "forwards" }}
    >
      <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{label}</p>
      <p
        className={`text-2xl font-semibold data-value ${colorClasses[color || "default"]}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value ?? "—"}
        {suffix && <span className="text-sm text-text-muted ml-1">{suffix}</span>}
      </p>
    </div>
  );
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

  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <Link
        href={page > 1 ? `${baseUrl}?page=${page - 1}` : "#"}
        className={`px-3 py-2 rounded-lg text-sm transition-all ${
          page > 1
            ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            : "text-text-muted cursor-not-allowed"
        }`}
      >
        ← Prev
      </Link>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-2 text-text-muted">
            ···
          </span>
        ) : (
          <Link
            key={i}
            href={`${baseUrl}?page=${p}`}
            className={`px-3 py-2 rounded-lg text-sm transition-all ${
              p === page
                ? "bg-accent text-bg-primary font-medium"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            }`}
          >
            {p}
          </Link>
        )
      )}
      <Link
        href={page < totalPages ? `${baseUrl}?page=${page + 1}` : "#"}
        className={`px-3 py-2 rounded-lg text-sm transition-all ${
          page < totalPages
            ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            : "text-text-muted cursor-not-allowed"
        }`}
      >
        Next →
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

  const sitesWithStatus = await Promise.all(
    sites.map(async (site) => {
      const latestCheck = await getLatestCheckForSite(site.id);
      const uptime = await getUptimePercentage(site.id, "24h");
      return { ...site, latestCheck, uptime };
    })
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-bg-secondary/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-accent status-pulse" />
            </div>
            <h1
              className="text-xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Uptime
            </h1>
            <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded-full border border-border">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/settings"
              className="text-text-secondary hover:text-text-primary transition-colors text-sm"
            >
              Settings
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-text-muted text-sm font-mono">
              {session.user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-text-secondary hover:text-danger transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Analytics Overview */}
        {analytics && (
          <section className="opacity-0 animate-fade-in" style={{ animationFillMode: "forwards" }}>
            <div className="flex items-center gap-3 mb-6">
              <h2
                className="text-sm font-medium text-text-secondary uppercase tracking-wider"
                style={{ fontFamily: "var(--font-display)" }}
              >
                System Overview
              </h2>
              <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded border border-border">
                24h
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard label="Total Sites" value={analytics.totalSites} delay="delay-50" />
              <StatCard
                label="Operational"
                value={analytics.sitesUp}
                color="accent"
                delay="delay-100"
              />
              <StatCard
                label="Down"
                value={analytics.sitesDown}
                color={analytics.sitesDown > 0 ? "danger" : "default"}
                delay="delay-150"
              />
              <StatCard
                label="Uptime"
                value={analytics.overallUptime24h}
                suffix="%"
                color={
                  analytics.overallUptime24h === null
                    ? "default"
                    : analytics.overallUptime24h >= 99
                    ? "accent"
                    : analytics.overallUptime24h >= 95
                    ? "warning"
                    : "danger"
                }
                delay="delay-200"
              />
              <StatCard
                label="Avg Response"
                value={analytics.avgResponseTime}
                suffix="ms"
                delay="delay-300"
              />
              <StatCard label="Total Checks" value={analytics.totalChecks24h} delay="delay-400" />
            </div>

            {/* Response Time Chart */}
            {analytics.hourlyData.length > 0 && (
              <div
                className="bg-bg-secondary border border-border rounded-lg p-6 opacity-0 animate-fade-in delay-500"
                style={{ animationFillMode: "forwards" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-sm font-medium text-text-secondary uppercase tracking-wider"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Response Time Trend
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      Response Time
                    </span>
                  </div>
                </div>
                <AnalyticsChart data={analytics.hourlyData} />
              </div>
            )}
          </section>
        )}

        {/* Sites List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2
                className="text-sm font-medium text-text-secondary uppercase tracking-wider"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Monitored Sites
              </h2>
              {total > 0 && (
                <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-0.5 rounded border border-border">
                  {total}
                </span>
              )}
            </div>
            <Link
              href="/sites/new"
              className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Site
            </Link>
          </div>

          {sitesWithStatus.length === 0 && page === 1 ? (
            <div
              className="bg-bg-secondary border border-border rounded-lg p-16 text-center opacity-0 animate-fade-in"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-bg-tertiary flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <h3
                className="text-lg font-medium mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                No sites monitored yet
              </h3>
              <p className="text-text-secondary text-sm mb-8 max-w-sm mx-auto">
                Add your first site to start monitoring uptime, response times, and SSL certificates.
              </p>
              <Link
                href="/sites/new"
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add your first site
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {sitesWithStatus.map((site, index) => (
                  <Link
                    key={site.id}
                    href={`/sites/${site.id}`}
                    className="block bg-bg-secondary border border-border rounded-lg p-5 card-interactive opacity-0 animate-fade-in"
                    style={{
                      animationFillMode: "forwards",
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        {/* Status dot */}
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            site.latestCheck?.status === "up"
                              ? "bg-success status-pulse"
                              : site.latestCheck?.status === "down"
                              ? "bg-danger status-pulse-danger"
                              : site.latestCheck?.status === "degraded"
                              ? "bg-warning"
                              : "bg-text-muted"
                          }`}
                        />
                        <div>
                          <h3 className="font-medium text-text-primary">{site.name}</h3>
                          <p className="text-sm text-text-muted font-mono mt-0.5">{site.url}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        {site.uptime !== null && (
                          <div className="text-right">
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Uptime</p>
                            <p
                              className={`text-lg font-semibold data-value ${
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
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Response</p>
                            <p
                              className="text-lg font-semibold text-text-primary data-value"
                              style={{ fontFamily: "var(--font-display)" }}
                            >
                              {site.latestCheck.responseTimeMs ?? "—"}
                              <span className="text-sm text-text-muted ml-0.5">ms</span>
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                          <StatusIndicator status={site.latestCheck?.status ?? null} />
                          {site.latestCheck && (
                            <span className="text-xs text-text-muted">
                              {formatTimeAgo(site.latestCheck.timestamp)}
                            </span>
                          )}
                        </div>

                        <svg
                          className="w-5 h-5 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-text-muted">
          <span style={{ fontFamily: "var(--font-display)" }}>
            Uptime — Website Monitoring
          </span>
          <span>
            Checks run every 5 minutes
          </span>
        </div>
      </footer>
    </div>
  );
}
