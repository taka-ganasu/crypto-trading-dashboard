"use client";

import type { OnchainDataPoint } from "@/types";
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

interface OnchainMetricChartProps {
  data: OnchainDataPoint[];
  threshold: number;
  label: string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; value: number | null } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{d.date}</p>
      <p className="font-mono text-zinc-200">
        {d.value != null ? d.value.toFixed(4) : "N/A"}
      </p>
    </div>
  );
}

export default function OnchainMetricChart({
  data,
  threshold,
  label,
  color,
}: OnchainMetricChartProps) {
  const filtered = data.filter((d) => d.value != null);

  if (filtered.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <p className="text-zinc-500">No {label} data available</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full" data-testid={`onchain-${label.toLowerCase()}-chart`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={filtered}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`grad-${label}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
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
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            width={60}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={threshold}
            stroke="#f87171"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `${threshold}`,
              position: "right",
              fill: "#f87171",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={`url(#grad-${label})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
