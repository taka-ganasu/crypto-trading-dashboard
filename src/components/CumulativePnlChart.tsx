"use client";

import { useMemo, useState } from "react";
import { formatCompactCurrency } from "@/lib/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CumulativePnlPoint {
  date: string;
  cumulative_pnl: number;
  daily_pnl: number;
}

type Granularity = "daily" | "weekly";

interface CumulativePnlChartProps {
  data: CumulativePnlPoint[];
}

const formatPnl = formatCompactCurrency;

function getWeekKey(dateStr: string): string {
  // Parse date string as local date (not UTC) to avoid timezone shift
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  const my = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const md = String(date.getDate()).padStart(2, "0");
  return `${my}-${mm}-${md}`;
}

function aggregateWeekly(
  data: CumulativePnlPoint[]
): CumulativePnlPoint[] {
  if (data.length === 0) return [];

  const weekMap = new Map<
    string,
    { weeklyPnl: number; lastCumPnl: number }
  >();

  for (const point of data) {
    const weekKey = getWeekKey(point.date);
    const existing = weekMap.get(weekKey);
    if (existing) {
      existing.weeklyPnl += point.daily_pnl;
      existing.lastCumPnl = point.cumulative_pnl;
    } else {
      weekMap.set(weekKey, {
        weeklyPnl: point.daily_pnl,
        lastCumPnl: point.cumulative_pnl,
      });
    }
  }

  return Array.from(weekMap.entries()).map(([weekStart, val]) => ({
    date: weekStart,
    cumulative_pnl: val.lastCumPnl,
    daily_pnl: val.weeklyPnl,
  }));
}

function CustomTooltip({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{ payload: CumulativePnlPoint }>;
  granularity: Granularity;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const cumColor =
    d.cumulative_pnl >= 0 ? "text-emerald-400" : "text-red-400";
  const periodColor = d.daily_pnl >= 0 ? "text-emerald-400" : "text-red-400";
  const periodLabel = granularity === "weekly" ? "Weekly PnL" : "Daily PnL";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{d.date}</p>
      <p className="text-zinc-400">
        Cumulative:{" "}
        <span className={`font-mono ${cumColor}`}>
          {d.cumulative_pnl >= 0 ? "+" : ""}${d.cumulative_pnl.toFixed(2)}
        </span>
      </p>
      <p className="text-zinc-400">
        {periodLabel}:{" "}
        <span className={`font-mono ${periodColor}`}>
          {d.daily_pnl >= 0 ? "+" : ""}${d.daily_pnl.toFixed(2)}
        </span>
      </p>
    </div>
  );
}

export default function CumulativePnlChart({
  data,
}: CumulativePnlChartProps) {
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const chartData = useMemo(() => {
    if (granularity === "weekly") return aggregateWeekly(data);
    return data;
  }, [data, granularity]);

  if (data.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        role="img"
        aria-label="Cumulative PnL chart"
      >
        <p className="text-zinc-500">No PnL data available</p>
      </div>
    );
  }

  const lastPnl = chartData[chartData.length - 1]?.cumulative_pnl ?? 0;
  const hasProfit = lastPnl >= 0;
  const strokeColor = hasProfit ? "#34d399" : "#f87171";

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1">
        <button
          onClick={() => setGranularity("daily")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            granularity === "daily"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setGranularity("weekly")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            granularity === "weekly"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Weekly
        </button>
      </div>
      <div
        className="h-72 w-full"
        data-testid="cumulative-pnl-chart"
        role="img"
        aria-label="Cumulative PnL chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="cumulativePnlGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={strokeColor}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={strokeColor}
                  stopOpacity={0}
                />
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
              tickFormatter={formatPnl}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              width={70}
            />
            <ReferenceLine
              y={0}
              stroke="#52525b"
              strokeDasharray="4 4"
              label={{
                value: "$0",
                position: "left",
                fill: "#71717a",
                fontSize: 10,
              }}
            />
            <Tooltip
              content={<CustomTooltip granularity={granularity} />}
            />
            <Area
              type="monotone"
              dataKey="cumulative_pnl"
              stroke={strokeColor}
              fill="url(#cumulativePnlGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
