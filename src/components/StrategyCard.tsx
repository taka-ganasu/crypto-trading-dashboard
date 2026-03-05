"use client";

import { formatPercent, formatPnl, colorByPnl } from "@/lib/format";
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

interface StrategyCardProps {
  strategy: StrategyPerformance;
  onClick: () => void;
}

export default function StrategyCard({ strategy, onClick }: StrategyCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">
          {strategy.strategy}
        </h3>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {strategy.trade_count} trades
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Win Rate
          </p>
          <p className="mt-0.5 font-mono text-sm text-zinc-100">
            {strategy.win_rate != null
              ? formatPercent(strategy.win_rate * 100, 1)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">PF</p>
          <p
            className={`mt-0.5 font-mono text-sm ${pfColor(strategy.profit_factor)}`}
          >
            {strategy.profit_factor != null
              ? strategy.profit_factor.toFixed(2)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Sharpe
          </p>
          <p
            className={`mt-0.5 font-mono text-sm ${sharpeColor(strategy.sharpe)}`}
          >
            {strategy.sharpe != null ? strategy.sharpe.toFixed(2) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Avg PnL
          </p>
          <p
            className={`mt-0.5 font-mono text-sm ${colorByPnl(strategy.avg_pnl ?? 0)}`}
          >
            {strategy.avg_pnl != null ? formatPnl(strategy.avg_pnl) : "—"}
          </p>
        </div>
      </div>
    </button>
  );
}
