"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { triggerCheck } from "@/lib/actions/checks";

type CheckData = {
  id: string;
  timestamp: string;
  status: "up" | "down" | "degraded";
  httpStatus: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
};

type ChartPoint = {
  timestamp: string;
  responseTime: number | null;
  status: "up" | "down" | "degraded";
};

type LatestCheck = {
  status: "up" | "down" | "degraded";
  timestamp: string;
  httpStatus: number | null;
  responseTimeMs: number | null;
  sslValid: boolean | null;
  sslExpiresAt: string | null;
  dnsResolved: boolean;
  contentFound: boolean | null;
  errorMessage: string | null;
};

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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${styles[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dotStyles[status]} ${status === "up" ? "status-pulse" : ""}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ChartPoint }> }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-text-muted mb-1">{formatTime(data.timestamp)}</p>
      <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>
        {data.responseTime ?? "—"} ms
      </p>
      <StatusBadge status={data.status} />
    </div>
  );
}

type Pagination = {
  page: number;
  totalPages: number;
  total: number;
};

export function SiteDetailClient({
  siteId,
  latestCheck,
  uptimePercent,
  avgResponseTime,
  chartData,
  checks,
  timeframe,
  pagination,
}: {
  siteId: string;
  siteName: string;
  siteUrl: string;
  latestCheck: LatestCheck | null;
  uptimePercent: number | null;
  avgResponseTime: number | null;
  chartData: ChartPoint[];
  checks: CheckData[];
  timeframe: "24h" | "7d" | "30d";
  pagination: Pagination;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      await triggerCheck(siteId);
      router.refresh();
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: "24h" | "7d" | "30d") => {
    startTransition(() => {
      router.push(`/sites/${siteId}?timeframe=${newTimeframe}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(`/sites/${siteId}?timeframe=${timeframe}&page=${newPage}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <p className="text-sm text-text-muted mb-1">Status</p>
          <StatusBadge status={latestCheck?.status ?? null} />
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <p className="text-sm text-text-muted mb-1">Uptime ({timeframe})</p>
          <p
            className={`text-2xl font-bold ${
              uptimePercent === null
                ? "text-text-muted"
                : uptimePercent >= 99
                ? "text-accent"
                : uptimePercent >= 95
                ? "text-warning"
                : "text-danger"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {uptimePercent !== null ? `${uptimePercent}%` : "—"}
          </p>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <p className="text-sm text-text-muted mb-1">Avg Response</p>
          <p
            className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {avgResponseTime !== null ? `${avgResponseTime}ms` : "—"}
          </p>
        </div>

        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <p className="text-sm text-text-muted mb-2">Actions</p>
          <button
            onClick={handleCheckNow}
            disabled={isChecking}
            className="w-full py-2 px-4 bg-accent text-bg-primary font-medium rounded-lg transition-all duration-200 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isChecking ? "Checking..." : "Check Now"}
          </button>
        </div>
      </div>

      {/* Response Time Chart */}
      <div className="bg-bg-secondary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Response Time
          </h3>
          <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
            {(["24h", "7d", "30d"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                disabled={isPending}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  timeframe === tf
                    ? "bg-accent text-bg-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={3000} stroke="var(--warning)" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--accent)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            No data for this timeframe
          </div>
        )}
      </div>

      {/* Latest Check Details */}
      {latestCheck && (
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <h3
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Latest Check Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-text-muted">HTTP Status</p>
              <p className="font-medium">{latestCheck.httpStatus ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Response Time</p>
              <p className="font-medium">{latestCheck.responseTimeMs ?? "—"} ms</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">DNS Resolved</p>
              <p className="font-medium">{latestCheck.dnsResolved ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">SSL Valid</p>
              <p className="font-medium">
                {latestCheck.sslValid === null ? "N/A" : latestCheck.sslValid ? "Yes" : "No"}
              </p>
            </div>
            {latestCheck.sslExpiresAt && (
              <div>
                <p className="text-sm text-text-muted">SSL Expires</p>
                <p className="font-medium">{new Date(latestCheck.sslExpiresAt).toLocaleDateString()}</p>
              </div>
            )}
            {latestCheck.contentFound !== null && (
              <div>
                <p className="text-sm text-text-muted">Content Found</p>
                <p className="font-medium">{latestCheck.contentFound ? "Yes" : "No"}</p>
              </div>
            )}
            {latestCheck.errorMessage && (
              <div className="col-span-2">
                <p className="text-sm text-text-muted">Error</p>
                <p className="font-medium text-danger">{latestCheck.errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check History */}
      <div className="bg-bg-secondary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Recent Checks
          </h3>
          {pagination.total > 0 && (
            <span className="text-sm text-text-muted">
              {pagination.total} total
            </span>
          )}
        </div>

        {checks.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-text-muted border-b border-border">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">HTTP</th>
                    <th className="pb-3 font-medium">Response</th>
                    <th className="pb-3 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr key={check.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-sm text-text-secondary">
                        {formatDateTime(check.timestamp)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={check.status} />
                      </td>
                      <td className="py-3 text-sm">{check.httpStatus ?? "—"}</td>
                      <td className="py-3 text-sm">{check.responseTimeMs ?? "—"} ms</td>
                      <td className="py-3 text-sm text-danger">{check.errorMessage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isPending}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pagination.page > 1
                      ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                      : "text-text-muted cursor-not-allowed"
                  }`}
                >
                  Previous
                </button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === pagination.totalPages ||
                      (p >= pagination.page - 1 && p <= pagination.page + 1)
                    );
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === "number" && p - (arr[idx - 1] as number) > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-text-muted">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p as number)}
                        disabled={isPending}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          p === pagination.page
                            ? "bg-accent text-bg-primary"
                            : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isPending}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    pagination.page < pagination.totalPages
                      ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                      : "text-text-muted cursor-not-allowed"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-text-muted text-center py-8">No checks yet</p>
        )}
      </div>
    </div>
  );
}
