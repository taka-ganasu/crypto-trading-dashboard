"use client";

import TimeRangeFilter from "@/components/TimeRangeFilter";
import { formatPnl, colorByPnl, formatTimestamp } from "@/lib/format";
import type { MdseSummaryDetector } from "@/types";

function winRateColor(rate: number): string {
  if (rate > 50) return "text-emerald-400";
  if (rate < 30) return "text-red-400";
  return "text-yellow-400";
}

function winRateBorder(rate: number): string {
  if (rate > 50) return "border-emerald-500/30";
  if (rate < 30) return "border-red-500/30";
  return "border-yellow-500/30";
}

function toPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

interface MdseOverviewProps {
  detectors: MdseSummaryDetector[];
}

export default function MdseOverview({ detectors }: MdseOverviewProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">
          MDSE Detector Status
        </h1>
        <TimeRangeFilter />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {detectors.map((d) => (
          <div
            key={d.detector_name}
            className={`rounded-lg border bg-zinc-900 p-4 ${winRateBorder(toPercent(d.win_rate))}`}
          >
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 truncate">
              {d.detector_name}
            </h2>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-zinc-500">Events</span>
              <span className="text-right font-mono text-zinc-300">
                {d.event_count}
              </span>
              <span className="text-zinc-500">Validated</span>
              <span className="text-right font-mono text-zinc-300">
                {d.validated_count}
              </span>
              <span className="text-zinc-500">Win Rate</span>
              <span className={`text-right font-mono ${winRateColor(toPercent(d.win_rate))}`}>
                {d.win_rate != null ? `${toPercent(d.win_rate).toFixed(1)}%` : "—"}
              </span>
              <span className="text-zinc-500">Avg PnL</span>
              <span
                className={`text-right font-mono ${d.avg_pnl != null ? colorByPnl(d.avg_pnl) : "text-zinc-500"}`}
              >
                {d.avg_pnl != null ? formatPnl(d.avg_pnl) : "—"}
              </span>
              <span className="text-zinc-500">Weight</span>
              <span className="text-right font-mono text-zinc-300">
                {d.weight != null ? d.weight.toFixed(2) : "—"}
              </span>
              <span className="text-zinc-500">Samples</span>
              <span className="text-right font-mono text-zinc-300">
                {d.sample_count != null ? d.sample_count : "—"}
              </span>
              <span className="text-zinc-500">Last Event</span>
              <span className="text-right font-mono text-zinc-400 text-xs">
                {d.last_event_at != null ? formatTimestamp(d.last_event_at) : "—"}
              </span>
            </div>
          </div>
        ))}
        {detectors.length === 0 && (
          <p className="col-span-full text-center text-zinc-500 py-8">
            No detector data available
          </p>
        )}
      </div>
    </section>
  );
}
