"use client";

import { useState } from "react";
import DetailPanel from "@/components/DetailPanel";
import DetailRow from "@/components/DetailRow";
import { formatNumber, formatPnl, colorByPnl, formatTimestamp } from "@/lib/format";
import type { MdseEvent, MdseTrade } from "@/types";

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

interface MdseTradesProps {
  trades: MdseTrade[];
  events: MdseEvent[];
}

export default function MdseTrades({ trades, events }: MdseTradesProps) {
  const [selectedTrade, setSelectedTrade] = useState<MdseTrade | null>(null);

  return (
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
