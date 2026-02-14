"use client";

import { useEffect, useState } from "react";
import {
  fetchPortfolioState,
  fetchCircuitBreakerState,
  fetchTrades,
} from "@/lib/api";
import type { PortfolioState, CircuitBreakerState, Trade } from "@/types";

const CB_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  NORMAL: {
    bg: "bg-emerald-950/50",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  WARNING: {
    bg: "bg-yellow-950/50",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  PAUSED: {
    bg: "bg-orange-950/50",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  STOPPED: { bg: "bg-red-950/50", text: "text-red-400", dot: "bg-red-400" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [cb, setCb] = useState<CircuitBreakerState | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pf, cbState, recentTrades] = await Promise.all([
          fetchPortfolioState(),
          fetchCircuitBreakerState(),
          fetchTrades(undefined, 3),
        ]);
        setPortfolio(pf);
        setCb(cbState);
        setTrades(recentTrades);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-zinc-500 text-xs mt-1">
            Make sure the API server is running
          </p>
        </div>
      </div>
    );
  }

  // Extract portfolio data
  const pfData = portfolio?.data ?? {};
  const totalBalance = (pfData.total_balance as number) ?? 0;
  const dailyPnl = (pfData.daily_pnl as number) ?? 0;
  const dailyPnlPct = (pfData.daily_pnl_pct as number) ?? 0;

  // Extract circuit breaker state
  const cbData = cb?.data ?? {};
  const cbStatus = ((cbData.status as string) ?? "NORMAL").toUpperCase();
  const badge = CB_BADGE[cbStatus] ?? CB_BADGE.NORMAL;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>

      {/* Top cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Portfolio Balance */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Total Balance
          </p>
          <p className="mt-2 text-2xl font-bold text-zinc-100">
            {formatCurrency(totalBalance)}
          </p>
        </div>

        {/* Daily PnL */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Daily PnL
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              dailyPnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {dailyPnl >= 0 ? "+" : ""}
            {formatCurrency(dailyPnl)}
            <span className="ml-2 text-sm font-normal">
              ({dailyPnlPct >= 0 ? "+" : ""}
              {dailyPnlPct.toFixed(2)}%)
            </span>
          </p>
        </div>

        {/* Circuit Breaker Status */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Circuit Breaker
          </p>
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${badge.bg} ${badge.text}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${badge.dot} animate-pulse`}
              />
              {cbStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-300">Recent Trades</h2>
        </div>
        {trades.length === 0 ? (
          <div className="px-5 py-8 text-center text-zinc-500 text-sm">
            No trades yet
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-10 text-center rounded text-xs font-semibold py-0.5 ${
                      trade.side.toUpperCase() === "BUY"
                        ? "bg-emerald-950/50 text-emerald-400"
                        : "bg-red-950/50 text-red-400"
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {trade.symbol}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {trade.entry_time ? formatDate(trade.entry_time) : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      trade.pnl != null && trade.pnl >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {trade.pnl != null
                      ? `${trade.pnl >= 0 ? "+" : ""}${formatCurrency(trade.pnl)}`
                      : "Open"}
                  </p>
                  {trade.pnl_pct != null && (
                    <p className="text-xs text-zinc-500">
                      {trade.pnl_pct >= 0 ? "+" : ""}
                      {trade.pnl_pct.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
