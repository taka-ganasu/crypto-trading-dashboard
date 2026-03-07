"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  fetchMdseSummary,
  fetchMdseEvents,
  fetchMdseTrades,
  fetchMdseTimeline,
} from "@/lib/api";
import DetailPanel from "@/components/DetailPanel";
import LoadingSpinner from "@/components/LoadingSpinner";
const MdseTimelineChart = dynamic(() => import("@/components/MdseTimelineChart"), { ssr: false });
import TimeRangeFilter, { useTimeRange } from "@/components/TimeRangeFilter";
import { formatNumber, formatPnl, colorByPnl, formatTimestamp } from "@/lib/format";
import type { MdseSummaryDetector, MdseEvent, MdseTrade, MdseTimeline } from "@/types";

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

function isLongDirection(direction: string | null | undefined): boolean {
  const normalized = (direction ?? "").toLowerCase();
  return normalized === "long" || normalized === "buy";
}

function detectorLabel(event: MdseEvent | null | undefined): string {
  if (!event) return "—";
  return event.detector ?? event.detector_name ?? "—";
}

export default function MdsePage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading MDSE data..." />}>
      <MdseContent />
    </Suspense>
  );
}

function MdseContent() {
  const [detectors, setDetectors] = useState<MdseSummaryDetector[]>([]);
  const [events, setEvents] = useState<MdseEvent[]>([]);
  const [trades, setTrades] = useState<MdseTrade[]>([]);
  const [timeline, setTimeline] = useState<MdseTimeline | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<MdseTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { start, end } = useTimeRange();

  const loadMdseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    const [summaryResult, eventsResult, tradesResult, timelineResult] =
      await Promise.allSettled([
        fetchMdseSummary(),
        fetchMdseEvents(24, start, end),
        fetchMdseTrades(20, start, end),
        fetchMdseTimeline(24, start, end),
      ]);

    const failedSections: string[] = [];
    let criticalFailures = 0;

    if (summaryResult.status === "fulfilled") {
      setDetectors(summaryResult.value.detectors ?? []);
    } else {
      setDetectors([]);
      failedSections.push("detector summary");
      criticalFailures += 1;
    }

    if (eventsResult.status === "fulfilled") {
      setEvents(eventsResult.value);
    } else {
      setEvents([]);
      failedSections.push("recent events");
      criticalFailures += 1;
    }

    if (tradesResult.status === "fulfilled") {
      setTrades(tradesResult.value);
    } else {
      setTrades([]);
      failedSections.push("trades");
      criticalFailures += 1;
    }

    if (timelineResult.status === "fulfilled") {
      setTimeline(timelineResult.value);
    } else {
      setTimeline(null);
      failedSections.push("timeline chart");
    }

    if (criticalFailures >= 3) {
      setError("Failed to load MDSE data.");
    } else if (failedSections.length > 0) {
      setWarning(
        `Some sections failed to load: ${failedSections.join(", ")}. Showing available data.`
      );
    }

    setLoading(false);
  }, [start, end]);

  useEffect(() => {
    void loadMdseData();
  }, [loadMdseData]);

  if (loading) {
    return <LoadingSpinner label="Loading MDSE data..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" role="alert" aria-live="assertive">
          <p className="text-red-400">Error: {error}</p>
          <button
            type="button"
            onClick={() => void loadMdseData()}
            className="mt-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {warning && (
        <div
          className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          role="status"
          aria-live="polite"
        >
          {warning}
        </div>
      )}

      {/* Detector Status Cards */}
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

      {/* Detector Timeline Chart */}
      <section>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Detector Timeline
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <MdseTimelineChart data={timeline} />
        </div>
      </section>

      {/* Recent Events Timeline */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-100">
            Recent Events
          </h2>
          <span className="text-sm text-zinc-500">
            {events.length} events
          </span>
        </div>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">
              No events found
            </p>
          ) : (
            events.map((ev) => {
              const confidencePct = Math.min(Math.max(toPercent(ev.confidence), 0), 100);
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                    {detectorLabel(ev)}
                  </span>
                  <span className="text-sm font-medium text-zinc-200 w-20">
                    {ev.symbol}
                  </span>
                  <span
                    className={`text-sm font-medium w-14 ${
                      isLongDirection(ev.direction)
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {ev.direction.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div
                        className={`h-2 rounded-full ${
                          confidencePct >= 70
                            ? "bg-emerald-500"
                            : confidencePct >= 40
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${confidencePct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-mono text-zinc-500">
                    {confidencePct.toFixed(1)}%
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500 w-36 text-right">
                    {formatTimestamp(ev.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* MDSE Trades Table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-100">MDSE Trades</h2>
          <span className="text-sm text-zinc-500">
            {trades.length} trades
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm" aria-label="MDSE trades table">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3 text-right">Entry Price</th>
                <th className="px-4 py-3 text-right">Exit Price</th>
                <th className="px-4 py-3 text-right">PnL</th>
                <th className="px-4 py-3 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {trades.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No MDSE trades found
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr
                    key={t.event_id}
                    onClick={() => setSelectedTrade(t)}
                    className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      #{t.event_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {t.symbol}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          isLongDirection(t.direction)
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {t.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {formatNumber(t.entry_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.exit_price != null
                        ? formatNumber(t.exit_price)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {t.pnl != null ? (
                        <span className={colorByPnl(t.pnl)}>
                          {formatPnl(t.pnl)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.position_size != null ? t.position_size.toFixed(4) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DetailPanel
          isOpen={selectedTrade != null}
          onClose={() => setSelectedTrade(null)}
          title="MDSE Trade Details"
        >
          {selectedTrade && (
            <MdseTradeDetail trade={selectedTrade} events={events} />
          )}
        </DetailPanel>
      </section>
    </div>
  );
}

function MdseTradeDetail({
  trade,
  events,
}: {
  trade: MdseTrade;
  events: MdseEvent[];
}) {
  const relatedEvent = events.find((ev) => ev.id === trade.event_id);
  const tradeWithExtra = trade as MdseTrade & {
    detector_name?: string;
    confidence?: number;
    timestamp?: string;
    confluence_score?: number;
  };
  const relatedEventExtra = (relatedEvent as MdseEvent & {
    confluence_score?: number;
  }) ?? null;

  const detectorName = tradeWithExtra.detector_name ?? detectorLabel(relatedEvent);
  const confidence = tradeWithExtra.confidence ?? relatedEvent?.confidence ?? null;
  const timestamp = tradeWithExtra.timestamp ?? relatedEvent?.timestamp ?? null;
  const confluenceScore =
    tradeWithExtra.confluence_score ?? relatedEventExtra?.confluence_score ?? null;

  return (
    <div className="space-y-3 text-sm">
      <DetailRow label="Event ID" value={`#${trade.event_id}`} />
      <DetailRow label="Detector Name" value={detectorName} />
      <DetailRow label="Symbol" value={trade.symbol} />
      <DetailRow label="Direction" value={trade.direction.toUpperCase()} />
      <DetailRow
        label="Confidence"
        value={confidence != null ? `${toPercent(confidence).toFixed(1)}%` : "—"}
      />
      <DetailRow
        label="Confluence Score"
        value={confluenceScore != null ? confluenceScore.toFixed(2) : "—"}
      />
      <DetailRow
        label="Timestamp"
        value={timestamp != null ? formatTimestamp(timestamp) : "—"}
      />
      <DetailRow
        label="PnL"
        value={trade.pnl != null ? formatPnl(trade.pnl) : "—"}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 pb-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right text-zinc-200 font-mono">{value}</span>
    </div>
  );
}
