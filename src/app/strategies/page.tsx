"use client";

import { useEffect, useState } from "react";
import { fetchStrategyPerformance } from "@/lib/api";
import { formatPercent, formatPnl, colorByPnl, formatNumber } from "@/lib/format";
import DetailPanel from "@/components/DetailPanel";
import StrategyCard from "@/components/StrategyCard";
import StrategyTable from "@/components/StrategyTable";
import type { StrategyPerformance } from "@/types";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyPerformance[]>([]);
  const [selected, setSelected] = useState<StrategyPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStrategyPerformance()
      .then(setStrategies)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Loading strategy data...</p>
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
        <h1 className="text-xl font-bold text-zinc-100">Strategies</h1>
        <span className="text-sm text-zinc-500">
          {strategies.length} strategies
        </span>
      </div>

      {/* Strategy Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {strategies.map((s) => (
          <StrategyCard
            key={s.strategy}
            strategy={s}
            onClick={() => setSelected(s)}
          />
        ))}
      </div>

      {/* Strategy Detail Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          Detail Comparison
        </h2>
        <StrategyTable strategies={strategies} onSelect={setSelected} />
      </div>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={selected != null}
        onClose={() => setSelected(null)}
        title="Strategy Details"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Strategy" value={selected.strategy} />
            <DetailRow
              label="Trade Count"
              value={String(selected.trade_count)}
            />
            <DetailRow
              label="Win Rate"
              value={
                selected.win_rate != null
                  ? formatPercent(selected.win_rate * 100, 1)
                  : "—"
              }
            />
            <DetailRow
              label="Profit Factor"
              value={
                selected.profit_factor != null
                  ? selected.profit_factor.toFixed(2)
                  : "—"
              }
            />
            <DetailRow
              label="Sharpe Ratio"
              value={
                selected.sharpe != null ? selected.sharpe.toFixed(2) : "—"
              }
            />
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 pb-2">
              <span className="text-zinc-500">Avg PnL</span>
              <span
                className={`text-right font-mono ${colorByPnl(selected.avg_pnl ?? 0)}`}
              >
                {selected.avg_pnl != null ? formatPnl(selected.avg_pnl) : "—"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 pb-2">
              <span className="text-zinc-500">Max Drawdown</span>
              <span className="text-right font-mono text-red-400">
                {selected.max_dd != null ? formatNumber(selected.max_dd) : "—"}
              </span>
            </div>
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
