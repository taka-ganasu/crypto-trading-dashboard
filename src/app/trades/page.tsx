"use client";

import { Suspense, useEffect, useState } from "react";
import { fetchTrades } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatNumber, formatPnl, colorByPnl, formatDateTime } from "@/lib/format";
import DetailPanel from "@/components/DetailPanel";
import TimeRangeFilter, { useTimeRange } from "@/components/TimeRangeFilter";
import ExecutionModeFilter, {
  useExecutionMode,
} from "@/components/ExecutionModeFilter";
import type { Trade } from "@/types";

export default function TradesPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading trades..." />}>
      <TradesContent />
    </Suspense>
  );
}

const PAGE_SIZE = 25;

function TradesContent() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [totalTrades, setTotalTrades] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [highlightTradeId, setHighlightTradeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { start, end } = useTimeRange();
  const { apiExecutionMode } = useExecutionMode();

  useEffect(() => {
    const tradeIdRaw = new URLSearchParams(window.location.search).get("tradeId");
    const parsedTradeId = tradeIdRaw ? Number(tradeIdRaw) : NaN;
    setHighlightTradeId(Number.isFinite(parsedTradeId) ? parsedTradeId : null);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [start, end, apiExecutionMode]);

  useEffect(() => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    setLoading(true);
    fetchTrades(undefined, PAGE_SIZE, start, end, apiExecutionMode, offset)
      .then((res) => {
        setTrades(res.trades);
        setTotalTrades(res.total);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [start, end, apiExecutionMode, currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalTrades / PAGE_SIZE));

  if (loading) {
    return <LoadingSpinner label="Loading trades..." />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Trade History</h1>
        <div className="flex items-center gap-4">
          <TimeRangeFilter />
          <ExecutionModeFilter />
          <span className="text-sm text-zinc-500">{totalTrades} trades</span>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          role="alert"
        >
          Data unavailable: {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm" aria-label="Trades table">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3 text-right">Entry Price</th>
              <th className="px-4 py-3 text-right">Exit Price</th>
              <th className="px-4 py-3 text-right">PnL</th>
              <th className="px-4 py-3">Entry Date</th>
              <th className="px-4 py-3">Exit Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {trades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
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
                      : <span className="text-zinc-500 italic">Open</span>}
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
                    {formatDateTime(trade.entry_time)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {trade.exit_time ? formatDateTime(trade.exit_time) : <span className="text-zinc-500 italic">Open</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
                  : "Open"
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
              label="Entry Date"
              value={formatDateTime(selectedTrade.entry_time)}
            />
            <DetailRow
              label="Exit Date"
              value={
                selectedTrade.exit_time
                  ? formatDateTime(selectedTrade.exit_time)
                  : "Open"
              }
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
