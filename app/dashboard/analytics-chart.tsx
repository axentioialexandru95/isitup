"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type HourlyData = {
  hour: string;
  avgResponseTime: number;
  uptime: number;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: HourlyData }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-text-muted mb-2">{data.hour}</p>
      <div className="space-y-1">
        <p className="text-sm">
          <span className="text-text-muted">Response: </span>
          <span className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
            {data.avgResponseTime}ms
          </span>
        </p>
        <p className="text-sm">
          <span className="text-text-muted">Uptime: </span>
          <span
            className={`font-medium ${
              data.uptime >= 99
                ? "text-accent"
                : data.uptime >= 95
                ? "text-warning"
                : "text-danger"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {data.uptime}%
          </span>
        </p>
      </div>
    </div>
  );
}

export function AnalyticsChart({ data }: { data: HourlyData[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}ms`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="avgResponseTime"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#responseGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
