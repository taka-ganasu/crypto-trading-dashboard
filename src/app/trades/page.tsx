"use client";

import { useEffect, useState } from "react";
import { fetchTrades } from "@/lib/api";
import { formatNumber, formatPnl, colorByPnl, formatDate } from "@/lib/format";
import DetailPanel from "@/components/DetailPanel";
import type { Trade } from "@/types";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [highlightTradeId, setHighlightTradeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tradeIdRaw = new URLSearchParams(window.location.search).get("tradeId");
    const parsedTradeId = tradeIdRaw ? Number(tradeIdRaw) : NaN;
    setHighlightTradeId(Number.isFinite(parsedTradeId) ? parsedTradeId : null);

    fetchTrades(undefined, 100)
      .then(setTrades)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Loading trades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Trade History</h1>
        <span className="text-sm text-zinc-500">{trades.length} trades</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3 text-right">Entry Price</th>
              <th className="px-4 py-3 text-right">Exit Price</th>
              <th className="px-4 py-3 text-right">PnL</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No trades found
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className={`hover:bg-zinc-900/50 transition-colors cursor-pointer ${
                    highlightTradeId === trade.id
                      ? "bg-zinc-800/60"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {trade.symbol}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        trade.side === "BUY"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {trade.strategy ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {formatNumber(trade.entry_price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {trade.exit_price != null
                      ? formatNumber(trade.exit_price)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {trade.pnl != null ? (
                      <span className={colorByPnl(trade.pnl)}>
                        {formatPnl(trade.pnl)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatDate(trade.entry_time)}
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
        title="Trade Details"
      >
        {selectedTrade && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Trade ID" value={`#${selectedTrade.id}`} />
            <DetailRow label="Symbol" value={selectedTrade.symbol} />
            <DetailRow label="Side" value={selectedTrade.side} />
            <DetailRow
              label="Entry Price"
              value={formatNumber(selectedTrade.entry_price)}
            />
            <DetailRow
              label="Exit Price"
              value={
                selectedTrade.exit_price != null
                  ? formatNumber(selectedTrade.exit_price)
                  : "—"
              }
            />
            <DetailRow
              label="PnL"
              value={
                selectedTrade.pnl != null
                  ? formatPnl(selectedTrade.pnl)
                  : "—"
              }
            />
            <DetailRow
              label="PnL %"
              value={
                selectedTrade.pnl_pct != null
                  ? `${selectedTrade.pnl_pct.toFixed(2)}%`
                  : "—"
              }
            />
            <DetailRow
              label="Strategy"
              value={selectedTrade.strategy ?? "—"}
            />
            <DetailRow
              label="Timestamp"
              value={formatDate(selectedTrade.entry_time)}
            />
            <DetailRow
              label="Duration"
              value={
                selectedTrade.entry_time && selectedTrade.exit_time
                  ? formatDuration(selectedTrade.entry_time, selectedTrade.exit_time)
                  : "Open"
              }
            />
            <DetailRow
              label="Fees"
              value={
                selectedTrade.fees != null
                  ? formatNumber(selectedTrade.fees)
                  : "—"
              }
            />
          </div>
        )}
      </DetailPanel>
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

function formatDuration(entryTime: string, exitTime: string): string {
  const start = new Date(entryTime).getTime();
  const end = new Date(exitTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "—";
  }

  const minutes = Math.round((end - start) / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}
