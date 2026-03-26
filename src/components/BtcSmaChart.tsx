"use client";

import type { BtcPricePoint } from "@/types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface BtcSmaChartProps {
  data: BtcPricePoint[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: BtcPricePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const priceAboveSma =
    d.sma_200 != null ? d.price > d.sma_200 : null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{d.date}</p>
      <p className="text-zinc-400">
        Price:{" "}
        <span className="font-mono text-zinc-200">
          ${d.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </p>
      <p className="text-zinc-400">
        200SMA:{" "}
        <span className="font-mono text-zinc-200">
          {d.sma_200 != null
            ? `$${d.sma_200.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : "N/A"}
        </span>
      </p>
      {priceAboveSma != null && (
        <p
          className={`mt-1 ${priceAboveSma ? "text-emerald-400" : "text-red-400"}`}
        >
          {priceAboveSma ? "BULL" : "BEAR"}
        </p>
      )}
    </div>
  );
}

function formatPrice(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export default function BtcSmaChart({ data }: BtcSmaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <p className="text-zinc-500">No BTC price data available</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full" data-testid="btc-sma-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            tickFormatter={formatPrice}
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
            width={60}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
          />
          <Line
            type="monotone"
            dataKey="price"
            name="BTC Price"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#f59e0b" }}
          />
          <Line
            type="monotone"
            dataKey="sma_200"
            name="200 SMA"
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
