"use client";

import { useMemo, useState } from "react";
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
import { formatDateShort, formatPrice } from "@/lib/format";
import type { MdseTimeline, MdseTimelineEvent } from "@/types";

const DETECTOR_COLORS: Record<string, string> = {
  fr_extreme: "#3b82f6",
  liq_cascade: "#ef4444",
  cross_asset_divergence: "#22c55e",
  oi_divergence: "#f97316",
  vol_regime_shift: "#a855f7",
  sentiment_spike: "#eab308",
};

const SYMBOL_COLORS: Record<string, string> = {
  "BTC/USDT": "#f59e0b",
  "ETH/USDT": "#6366f1",
  "XRP/USDT": "#22c55e",
  "SOL/USDT": "#ec4899",
  "HYPE/USDT": "#14b8a6",
};

function getDetectorColor(detector: string): string {
  const key = detector.toLowerCase().replace(/\s+/g, "_");
  return DETECTOR_COLORS[key] ?? "#71717a";
}

function getSymbolColor(symbol: string): string {
  return SYMBOL_COLORS[symbol] ?? "#a1a1aa";
}

const formatTime = formatDateShort;

function detectorName(event: MdseTimelineEvent): string {
  return event.detector ?? event.detector_name ?? "unknown";
}

function isLongDirection(direction: string | null | undefined): boolean {
  const normalized = (direction ?? "").toLowerCase();
  return normalized === "long" || normalized === "buy";
}

interface ChartDataPoint {
  time: number;
  timestamp: string;
  price: number;
  symbol: string;
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
        {d.symbol}:{" "}
        <span className="font-mono text-zinc-200">
          {formatPrice(d.price, {
            compact: true,
            compactDecimals: 1,
            currency: true,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
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
  const color = getDetectorColor(detectorName(event));
  const isLong = isLongDirection(event.direction);
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
  const symbols = useMemo(() => {
    if (!data) return [];
    const symbolSet = new Set<string>();
    for (const p of data.prices) {
      if (p.symbol) symbolSet.add(p.symbol);
    }
    return [...symbolSet].sort();
  }, [data]);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Auto-select first symbol if none selected
  const activeSymbol = selectedSymbol ?? symbols[0] ?? null;

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!data) return [];
    return data.prices
      .filter(
        (p) =>
          typeof p.price === "number" &&
          Number.isFinite(p.price) &&
          p.symbol != null &&
          (activeSymbol == null || p.symbol === activeSymbol)
      )
      .map((p) => ({
        time: new Date(p.timestamp).getTime(),
        timestamp: p.timestamp,
        price: p.price as number,
        symbol: p.symbol as string,
      }))
      .filter((p) => Number.isFinite(p.time))
      .sort((a, b) => a.time - b.time);
  }, [data, activeSymbol]);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    if (activeSymbol == null) return data.events;
    return data.events.filter((ev) => ev.symbol === activeSymbol);
  }, [data, activeSymbol]);

  if (!data || data.prices.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        data-testid="mdse-timeline-chart"
        role="img"
        aria-label="Detector timeline chart"
      >
        <p className="text-zinc-500">No timeline data available</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        data-testid="mdse-timeline-chart"
        role="img"
        aria-label="Detector timeline chart"
      >
        <p className="text-zinc-500">No price data for selected symbol</p>
      </div>
    );
  }

  const detectors = [
    ...new Set(
      filteredEvents.map((e) => detectorName(e)).filter((name) => name !== "unknown")
    ),
  ];

  return (
    <div data-testid="mdse-timeline-chart" role="img" aria-label="Detector timeline chart">
      {/* Symbol Selector */}
      {symbols.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2" data-testid="mdse-symbol-selector">
          {symbols.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setSelectedSymbol(sym)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                sym === activeSymbol
                  ? "text-zinc-100 border"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
              }`}
              style={
                sym === activeSymbol
                  ? { backgroundColor: getSymbolColor(sym) + "22", borderColor: getSymbolColor(sym) }
                  : undefined
              }
            >
              {sym}
            </button>
          ))}
        </div>
      )}

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
              tickFormatter={(value: number) =>
                formatPrice(value, {
                  compact: true,
                  compactDecimals: 1,
                  currency: true,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              width={70}
            />
            <Tooltip content={<EventTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={activeSymbol ? getSymbolColor(activeSymbol) : "#71717a"}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: activeSymbol ? getSymbolColor(activeSymbol) : "#a1a1aa" }}
            />
            {filteredEvents.map((ev) => {
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

      {/* Active symbol label (single symbol) */}
      {activeSymbol && symbols.length <= 1 && (
        <div className="mt-2 text-xs text-zinc-500">
          Showing: <span className="font-medium text-zinc-400">{activeSymbol}</span>
        </div>
      )}

      {/* Detector Legend */}
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
