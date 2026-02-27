"use client";

import { useEffect, useState } from "react";
import { fetchPortfolioState } from "@/lib/api";
import { formatNumber, formatCurrency, formatPercent, formatPnl, colorByPnl, formatTimestamp } from "@/lib/format";

interface StrategyEntry {
  id: string;
  symbol: string;
  strategy: string;
  allocation_pct: number;
  equity: number;
  initial_equity: number;
  pnl: number;
  pnl_pct: number;
}

function parseStrategies(data: Record<string, unknown>): {
  strategies: StrategyEntry[];
  totalEquity: number;
  lastUpdated: string | null;
} {
  const strategies: StrategyEntry[] = [];
  let totalEquity = 0;
  let lastUpdated: string | null = null;

  if (typeof data.last_updated === "string") {
    lastUpdated = data.last_updated;
  }

  if (typeof data.total_equity === "number") {
    totalEquity = data.total_equity;
  }

  const strats =
    (data.strategies as Record<string, Record<string, unknown>> | undefined) ??
    (data.positions as Record<string, Record<string, unknown>> | undefined);

  if (strats && typeof strats === "object") {
    for (const [id, s] of Object.entries(strats)) {
      const equity = Number(s.equity ?? 0);
      const initial = Number(s.initial_equity ?? equity);
      const pnl = equity - initial;
      const pnlPct = initial > 0 ? (pnl / initial) * 100 : 0;

      strategies.push({
        id,
        symbol: String(s.symbol ?? id.replace(/_/g, " ").toUpperCase()),
        strategy: String(s.strategy ?? "unknown"),
        allocation_pct: Number(s.allocation_pct ?? 0),
        equity,
        initial_equity: initial,
        pnl,
        pnl_pct: pnlPct,
      });

      if (!totalEquity) {
        totalEquity += equity;
      }
    }
  }

  return { strategies, totalEquity, lastUpdated };
}

export default function PortfolioPage() {
  const [strategies, setStrategies] = useState<StrategyEntry[]>([]);
  const [totalEquity, setTotalEquity] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioState()
      .then((state) => {
        const parsed = parseStrategies(state.data);
        setStrategies(parsed.strategies);
        setTotalEquity(parsed.totalEquity);
        setLastUpdated(parsed.lastUpdated);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-sm">Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-zinc-600 text-xs mt-1">
            Make sure the API server is running on port 8000
          </p>
        </div>
      </div>
    );
  }

  const totalPnl = strategies.reduce((sum, s) => sum + s.pnl, 0);
  const totalInitial = strategies.reduce((sum, s) => sum + s.initial_equity, 0);
  const totalPnlPct = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Total Value
          </p>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(totalEquity)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Total PnL
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${colorByPnl(totalPnl)}`}
          >
            {totalPnl >= 0 ? "+" : ""}
            {formatCurrency(totalPnl)}
            <span className="text-sm ml-1">
              ({formatPnl(totalPnlPct)}%)
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Last Updated
          </p>
          <p className="text-sm text-zinc-300 mt-2">
            {lastUpdated
              ? formatTimestamp(lastUpdated)
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Strategy Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300">
            Strategy Allocations
          </h3>
        </div>
        {strategies.length === 0 ? (
          <div className="px-4 py-8 text-center text-zinc-500 text-sm">
            No strategy data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Symbol</th>
                  <th className="text-left px-4 py-3 font-medium">Strategy</th>
                  <th className="text-right px-4 py-3 font-medium">
                    Allocation %
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    Current Value
                  </th>
                  <th className="text-right px-4 py-3 font-medium">PnL</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      {s.symbol}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{s.strategy}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {formatPercent(s.allocation_pct, 1)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                      {formatCurrency(s.equity)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${colorByPnl(s.pnl)}`}
                    >
                      {formatPnl(s.pnl)}
                      <span className="text-xs ml-1 opacity-70">
                        ({formatPnl(s.pnl_pct)}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
