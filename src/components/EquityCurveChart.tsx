"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface EquityCurvePoint {
  date: string;
  balance: number;
  daily_pnl: number;
  cumulative_pnl: number;
}

interface EquityCurveChartProps {
  data: EquityCurvePoint[];
}

function formatBalance(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EquityCurvePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pnlColor = d.daily_pnl >= 0 ? "text-emerald-400" : "text-red-400";
  const cumColor = d.cumulative_pnl >= 0 ? "text-emerald-400" : "text-red-400";
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{d.date}</p>
      <p className="text-zinc-400">
        Balance: <span className="font-mono text-zinc-200">{formatBalance(d.balance)}</span>
      </p>
      <p className="text-zinc-400">
        Daily PnL:{" "}
        <span className={`font-mono ${pnlColor}`}>
          {d.daily_pnl >= 0 ? "+" : ""}
          ${d.daily_pnl.toFixed(2)}
        </span>
      </p>
      <p className="text-zinc-400">
        Cumulative:{" "}
        <span className={`font-mono ${cumColor}`}>
          {d.cumulative_pnl >= 0 ? "+" : ""}
          ${d.cumulative_pnl.toFixed(2)}
        </span>
      </p>
    </div>
  );
}

export default function EquityCurveChart({ data }: EquityCurveChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        role="img"
        aria-label="Equity curve chart"
      >
        <p className="text-zinc-500">No equity data available</p>
      </div>
    );
  }

  const hasProfit = data[data.length - 1].cumulative_pnl >= 0;
  const strokeColor = hasProfit ? "#34d399" : "#f87171";

  return (
    <div
      className="h-72 w-full"
      data-testid="equity-curve-chart"
      role="img"
      aria-label="Equity curve chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            tickFormatter={formatBalance}
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={strokeColor}
            fill="url(#equityGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
