"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DailyPnlPoint {
  date: string;
  daily_pnl: number;
}

interface DailyPnlChartProps {
  data: DailyPnlPoint[];
}

function formatPnl(value: number): string {
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailyPnlPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.daily_pnl >= 0 ? "text-emerald-400" : "text-red-400";
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{d.date}</p>
      <p className="text-zinc-400">
        PnL:{" "}
        <span className={`font-mono ${color}`}>
          {d.daily_pnl >= 0 ? "+" : ""}${d.daily_pnl.toFixed(2)}
        </span>
      </p>
    </div>
  );
}

export default function DailyPnlChart({ data }: DailyPnlChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <p className="text-zinc-500">No PnL data available</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full" data-testid="daily-pnl-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            tickFormatter={formatPnl}
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="daily_pnl" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.daily_pnl >= 0 ? "#34d399" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
