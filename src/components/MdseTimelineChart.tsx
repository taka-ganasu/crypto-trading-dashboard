"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MdseTimeline, MdseTimelineEvent } from "@/types";

const DETECTOR_COLORS: Record<string, string> = {
  fr_extreme: "#3b82f6",
  liq_cascade: "#ef4444",
  cross_asset_divergence: "#22c55e",
  oi_divergence: "#f97316",
  vol_regime_shift: "#a855f7",
  sentiment_spike: "#eab308",
};

function getDetectorColor(detector: string): string {
  const key = detector.toLowerCase().replace(/\s+/g, "_");
  return DETECTOR_COLORS[key] ?? "#71717a";
}

function formatPrice(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ChartDataPoint {
  time: number;
  timestamp: string;
  price: number;
}

function EventTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-300">{formatTime(d.timestamp)}</p>
      <p className="text-zinc-400">
        Price:{" "}
        <span className="font-mono text-zinc-200">{formatPrice(d.price)}</span>
      </p>
    </div>
  );
}

function EventDot({
  event,
  cx,
  cy,
}: {
  event: MdseTimelineEvent;
  cx: number;
  cy: number;
}) {
  const color = getDetectorColor(event.detector);
  const isLong = event.direction === "long";
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1.5} />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={9}
        fontWeight="bold"
      >
        {isLong ? "L" : "S"}
      </text>
    </g>
  );
}

interface MdseTimelineChartProps {
  data: MdseTimeline | null;
}

export default function MdseTimelineChart({ data }: MdseTimelineChartProps) {
  if (!data || data.prices.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        data-testid="mdse-timeline-chart"
      >
        <p className="text-zinc-500">No timeline data available</p>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.prices.map((p) => ({
    time: new Date(p.timestamp).getTime(),
    timestamp: p.timestamp,
    price: p.price,
  }));

  const eventMap = new Map<number, MdseTimelineEvent>();
  for (const ev of data.events) {
    const t = new Date(ev.timestamp).getTime();
    // Find closest price point
    let closest = chartData[0];
    let minDiff = Math.abs(closest.time - t);
    for (const pt of chartData) {
      const diff = Math.abs(pt.time - t);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    eventMap.set(closest.time, ev);
  }

  const detectors = [...new Set(data.events.map((e) => e.detector))];

  return (
    <div data-testid="mdse-timeline-chart">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => formatTime(new Date(v).toISOString())}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={formatPrice}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              width={70}
            />
            <Tooltip content={<EventTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#71717a"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#a1a1aa" }}
            />
            {data.events.map((ev) => {
              const t = new Date(ev.timestamp).getTime();
              let closestPt = chartData[0];
              let minDiff = Math.abs(closestPt.time - t);
              for (const pt of chartData) {
                const diff = Math.abs(pt.time - t);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestPt = pt;
                }
              }
              return (
                <ReferenceDot
                  key={ev.id}
                  x={closestPt.time}
                  y={closestPt.price}
                  shape={(props: Record<string, number>) => (
                    <EventDot event={ev} cx={props.cx} cy={props.cy} />
                  )}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {detectors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3" data-testid="mdse-timeline-legend">
          {detectors.map((det) => (
            <div key={det} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getDetectorColor(det) }}
              />
              {det}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
