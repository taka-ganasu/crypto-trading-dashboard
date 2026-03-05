"use client";

import { formatPercent, formatPnl, colorByPnl, formatNumber } from "@/lib/format";
import type { StrategyPerformance } from "@/types";

function pfColor(pf: number | null): string {
  if (pf == null) return "text-zinc-500";
  if (pf >= 1.5) return "text-emerald-400";
  if (pf >= 1.0) return "text-yellow-400";
  return "text-red-400";
}

function sharpeColor(sharpe: number | null): string {
  if (sharpe == null) return "text-zinc-500";
  if (sharpe >= 1.0) return "text-emerald-400";
  if (sharpe >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

interface StrategyTableProps {
  strategies: StrategyPerformance[];
  onSelect: (strategy: StrategyPerformance) => void;
}

export default function StrategyTable({
  strategies,
  onSelect,
}: StrategyTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-3">Strategy</th>
            <th className="px-4 py-3 text-right">Trades</th>
            <th className="px-4 py-3 text-right">Win Rate</th>
            <th className="px-4 py-3 text-right">Profit Factor</th>
            <th className="px-4 py-3 text-right">Sharpe</th>
            <th className="px-4 py-3 text-right">Avg PnL</th>
            <th className="px-4 py-3 text-right">Max DD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {strategies.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-zinc-500"
              >
                No strategy data available
              </td>
            </tr>
          ) : (
            strategies.map((s) => (
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
