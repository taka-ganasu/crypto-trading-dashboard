"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TradeByStrategyDaily } from "@/types";

interface DailyStrategyPnlChartProps {
  data: TradeByStrategyDaily[];
}

type ChartRow = {
  date: string;
  [strategy: string]: string | number;
};

type TooltipEntry = {
  color?: string;
  name?: string;
  value?: number | string;
};

const STRATEGY_COLORS = [
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#f59e0b", // amber-500
  "#a78bfa", // violet-400
  "#f87171", // red-400
  "#2dd4bf", // teal-400
  "#fb923c", // orange-400
  "#e879f9", // fuchsia-400
  "#22d3ee", // cyan-400
  "#84cc16", // lime-500
];

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function normalizeRows(rows: TradeByStrategyDaily[]): {
  chartData: ChartRow[];
  strategies: string[];
} {
  const strategies = Array.from(
    new Set(rows.map((row) => row.strategy || "unknown"))
  ).sort((a, b) => a.localeCompare(b));

  const grouped = new Map<string, ChartRow>();

  for (const row of rows) {
    const strategy = row.strategy || "unknown";
    const date = row.date;

    if (!grouped.has(date)) {
      grouped.set(date, { date });
    }

    const item = grouped.get(date);
    if (!item) continue;

    const current =
      typeof item[strategy] === "number" ? (item[strategy] as number) : 0;
    item[strategy] = current + (row.daily_pnl ?? 0);
  }

  const chartData = Array.from(grouped.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  return { chartData, strategies };
}

function CustomTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const entries = payload
    .map((entry) => ({
      color: entry.color ?? "#a1a1aa",
      name: String(entry.name ?? "unknown"),
      value: Number(entry.value ?? 0),
    }))
    .filter((entry) => entry.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-zinc-300">{label}</p>
      <div className="space-y-1">
        {entries.map((entry) => (
          <p key={entry.name} className="flex items-center justify-between gap-3 text-zinc-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className={`font-mono ${entry.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {entry.value >= 0 ? "+" : ""}${entry.value.toFixed(2)}
            </span>
          </p>
        ))}
      </div>
      <p className="mt-2 border-t border-zinc-800 pt-2 text-zinc-400">
        Total:{" "}
        <span className={`font-mono ${total >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {total >= 0 ? "+" : ""}${total.toFixed(2)}
        </span>
      </p>
    </div>
  );
}

export default function DailyStrategyPnlChart({ data }: DailyStrategyPnlChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        role="img"
        aria-label="Daily strategy pnl chart"
      >
        <p className="text-zinc-500">No trade data yet</p>
      </div>
    );
  }

  const { chartData, strategies } = normalizeRows(data);

  if (chartData.length === 0 || strategies.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        role="img"
        aria-label="Daily strategy pnl chart"
      >
        <p className="text-zinc-500">No trade data yet</p>
      </div>
    );
  }

  return (
    <div
      className="h-80 w-full"
      data-testid="daily-strategy-pnl-chart"
      role="img"
      aria-label="Daily strategy pnl chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />

          {strategies.map((strategy, index) => (
            <Bar
              key={strategy}
              dataKey={strategy}
              stackId="daily-pnl"
              fill={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
