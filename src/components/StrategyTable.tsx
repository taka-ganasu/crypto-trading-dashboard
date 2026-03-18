"use client";

import { useMemo, useState } from "react";
import { formatPercent, formatPnl, colorByPnl, formatNumber } from "@/lib/format";
import type { StrategyPerformance } from "@/types";

function pfColor(pf: number | null | undefined): string {
  if (pf == null) return "text-zinc-500";
  if (pf >= 1.5) return "text-emerald-400";
  if (pf >= 1.0) return "text-yellow-400";
  return "text-red-400";
}

function sharpeColor(sharpe: number | null | undefined): string {
  if (sharpe == null) return "text-zinc-500";
  if (sharpe >= 1.0) return "text-emerald-400";
  if (sharpe >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

interface StrategyTableProps {
  strategies: StrategyPerformance[];
  onSelect: (strategy: StrategyPerformance) => void;
}

type SortKey = "win_rate" | "profit_factor" | "sharpe" | null;
type SortDirection = "asc" | "desc";

function sortValue(
  strategy: StrategyPerformance,
  key: Exclude<SortKey, null>
): number | null {
  const value = strategy[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function StrategyTable({
  strategies,
  onSelect,
}: StrategyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedStrategies = useMemo(() => {
    if (sortKey == null) {
      return strategies;
    }

    return [...strategies].sort((a, b) => {
      const aValue = sortValue(a, sortKey);
      const bValue = sortValue(b, sortKey);

      if (aValue == null && bValue == null) {
        return a.strategy.localeCompare(b.strategy);
      }
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const diff = aValue - bValue;
      if (diff === 0) {
        return a.strategy.localeCompare(b.strategy);
      }
      return sortDirection === "asc" ? diff : -diff;
    });
  }, [sortDirection, sortKey, strategies]);

  function handleSort(nextKey: Exclude<SortKey, null>): void {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  }

  function sortIndicator(column: Exclude<SortKey, null>): string {
    if (sortKey !== column) return "SORT";
    return sortDirection === "desc" ? "DESC" : "ASC";
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm" aria-label="Strategy comparison table">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-3">Strategy</th>
            <th className="px-4 py-3 text-right">Trades</th>
            <th className="px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("win_rate")}
                className="inline-flex items-center gap-2 text-right"
                aria-label="Win Rate"
              >
                <span>Win Rate</span>
                <span aria-hidden="true" className="text-[10px] text-zinc-600">
                  {sortIndicator("win_rate")}
                </span>
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("profit_factor")}
                className="inline-flex items-center gap-2 text-right"
                aria-label="Profit Factor"
              >
                <span>Profit Factor</span>
                <span
                  aria-hidden="true"
                  className="text-[10px] text-zinc-600"
                >
                  {sortIndicator("profit_factor")}
                </span>
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => handleSort("sharpe")}
                className="inline-flex items-center gap-2 text-right"
                aria-label="Sharpe"
              >
                <span>Sharpe</span>
                <span aria-hidden="true" className="text-[10px] text-zinc-600">
                  {sortIndicator("sharpe")}
                </span>
              </button>
            </th>
            <th className="px-4 py-3 text-right">Avg PnL</th>
            <th className="px-4 py-3 text-right">Max DD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {sortedStrategies.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-zinc-500"
              >
                No strategy data available
              </td>
            </tr>
          ) : (
            sortedStrategies.map((s) => (
              <tr
                key={s.strategy}
                onClick={() => onSelect(s)}
                className="cursor-pointer transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-medium text-zinc-200">
                  {s.strategy}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {s.trade_count}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {s.win_rate != null
                    ? formatPercent(s.win_rate * 100, 1)
                    : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${pfColor(s.profit_factor)}`}
                >
                  {s.profit_factor != null ? s.profit_factor.toFixed(2) : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${sharpeColor(s.sharpe)}`}
                >
                  {s.sharpe != null ? s.sharpe.toFixed(2) : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${colorByPnl(s.avg_pnl ?? 0)}`}
                >
                  {s.avg_pnl != null ? formatPnl(s.avg_pnl) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-red-400">
                  {s.max_dd != null ? formatNumber(s.max_dd) : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
