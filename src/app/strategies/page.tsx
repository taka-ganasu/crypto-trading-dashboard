"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStrategies,
  fetchStrategyPerformance,
  fetchSystemStatsOverview,
} from "@/lib/api";
import ExecutionModeFilter, {
  useExecutionMode,
} from "@/components/ExecutionModeFilter";
import DetailRow from "@/components/DetailRow";
import LoadingSpinner from "@/components/LoadingSpinner";
import DetailPanel from "@/components/DetailPanel";
import { colorByPnl, formatPercent, formatPnl } from "@/lib/format";
import type {
  StrategyPerformance,
} from "@/types";

interface StrategyRow {
  strategy: string;
  trade_count: number;
  win_rate: number | null;
  profit_factor: number | null;
  sharpe: number | null;
  avg_pnl: number | null;
  max_dd: number | null;
}

type SortKey = "win_rate" | "profit_factor" | "sharpe";
type SortDir = "desc" | "asc";

function perfToRow(perf: StrategyPerformance): StrategyRow {
  return {
    strategy: perf.strategy,
    trade_count: perf.trade_count,
    win_rate: perf.win_rate,
    profit_factor: perf.profit_factor,
    sharpe: perf.sharpe ?? null,
    avg_pnl: perf.avg_pnl ?? null,
    max_dd: perf.max_dd ?? null,
  };
}

export default function StrategiesPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading strategy data..." />}>
      <StrategiesContent />
    </Suspense>
  );
}

function StrategiesContent() {
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<StrategyRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { apiExecutionMode } = useExecutionMode();

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setWarning(null);
    setSelectedRow(null);

    const [strategiesResult, performanceResult, statsResult] = await Promise.allSettled([
      fetchStrategies(apiExecutionMode),
      fetchStrategyPerformance(apiExecutionMode),
      fetchSystemStatsOverview(),
    ]);

    const warningParts: string[] = [];
    if (strategiesResult.status !== "fulfilled") warningParts.push("/api/strategies");
    if (performanceResult.status !== "fulfilled") warningParts.push("/api/performance/by-strategy");
    if (statsResult.status !== "fulfilled") warningParts.push("/api/system/stats");

    const performanceRows: StrategyPerformance[] =
      performanceResult.status === "fulfilled" ? performanceResult.value : [];

    const finalRows = performanceRows.map(perfToRow);
    setRows(finalRows);

    if (finalRows.length === 0 && warningParts.length > 0) {
      setError("Failed to load strategy data from API. Ensure the bot API server is running and reachable.");
    } else if (warningParts.length > 0) {
      setWarning(
        `Some sources failed to load: ${warningParts.join(", ")}. Showing available data.`
      );
    }

    setLoading(false);
  }, [apiExecutionMode]);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [rows, sortKey, sortDir]);

  if (loading) {
    return <LoadingSpinner label="Loading strategy data..." />;
  }

  const pageHeader = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-zinc-100">Strategies</h1>
        <p className="text-xs text-zinc-500">{rows.length} strategies</p>
      </div>
      <ExecutionModeFilter />
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="text-center py-8" role="alert" aria-live="assertive">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="text-center py-8">
          <p className="text-zinc-400 text-sm">No trades yet for this execution mode.</p>
          <p className="text-zinc-500 text-xs mt-1">
            Strategy metrics will appear after trades are closed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}

      {warning && (
        <div
          className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          role="status"
          aria-live="polite"
        >
          {warning}
        </div>
      )}

      {/* Strategy Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => (
          <button
            key={row.strategy}
            type="button"
            onClick={() => setSelectedRow(row)}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:bg-zinc-800/70"
          >
            <p className="text-sm font-semibold text-zinc-100">{row.strategy}</p>
            <p className="mt-1 text-xs text-zinc-500">{row.trade_count} trades</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-zinc-400">
                WR: {row.win_rate != null ? formatPercent(row.win_rate * 100, 1) : "—"}
              </span>
              <span className="text-zinc-400">
                PF: {row.profit_factor != null ? row.profit_factor.toFixed(2) : "—"}
              </span>
              <span className={row.avg_pnl != null ? colorByPnl(row.avg_pnl) : "text-zinc-500"}>
                {row.avg_pnl != null ? formatPnl(row.avg_pnl) : "—"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail Comparison Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Detail Comparison</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
          <table className="w-full text-sm" aria-label="Strategy comparison table">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Strategy</th>
                <th className="text-right px-4 py-3 font-medium">Trades</th>
                <SortableHeader label="Win Rate" sortKey="win_rate" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Profit Factor" sortKey="profit_factor" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortableHeader label="Sharpe" sortKey="sharpe" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-right px-4 py-3 font-medium">Avg PnL</th>
                <th className="text-right px-4 py-3 font-medium">Max DD</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.strategy}
                  onClick={() => setSelectedRow(row)}
                  className="border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-200">{row.strategy}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {row.trade_count}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {row.win_rate != null ? formatPercent(row.win_rate * 100, 1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {row.profit_factor != null ? row.profit_factor.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {row.sharpe != null ? row.sharpe.toFixed(2) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      row.avg_pnl != null ? colorByPnl(row.avg_pnl) : "text-zinc-500"
                    }`}
                  >
                    {row.avg_pnl != null ? formatPnl(row.avg_pnl) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {row.max_dd != null ? formatPnl(-Math.abs(row.max_dd)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={selectedRow != null}
        onClose={() => setSelectedRow(null)}
        title="Strategy Details"
      >
        {selectedRow && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Strategy" value={selectedRow.strategy} />
            <DetailRow label="Trades" value={String(selectedRow.trade_count)} />
            <DetailRow
              label="Win Rate"
              value={
                selectedRow.win_rate != null
                  ? formatPercent(selectedRow.win_rate * 100, 1)
                  : "—"
              }
            />
            <DetailRow
              label="Profit Factor"
              value={
                selectedRow.profit_factor != null
                  ? selectedRow.profit_factor.toFixed(2)
                  : "—"
              }
            />
            <DetailRow
              label="Sharpe Ratio"
              value={
                selectedRow.sharpe != null
                  ? selectedRow.sharpe.toFixed(2)
                  : "—"
              }
            />
            <DetailRow
              label="Avg PnL"
              value={
                selectedRow.avg_pnl != null
                  ? formatPnl(selectedRow.avg_pnl)
                  : "—"
              }
            />
            <DetailRow
              label="Max Drawdown"
              value={
                selectedRow.max_dd != null
                  ? formatPnl(-Math.abs(selectedRow.max_dd))
                  : "—"
              }
            />
          </div>
        )}
      </DetailPanel>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey | null;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  const indicator = isActive ? (dir === "desc" ? "DESC" : "ASC") : "SORT";

  return (
    <th className="text-right px-4 py-3 font-medium">
      <button
        type="button"
        aria-label={label}
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-zinc-300 transition-colors"
      >
        {label}
        <span className="text-zinc-400 text-[10px] ml-1" aria-hidden="true">
          {indicator}
        </span>
      </button>
    </th>
  );
}
