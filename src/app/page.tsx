"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchPortfolioState,
  fetchCircuitBreakerState,
  fetchTrades,
} from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatsOverviewCards from "@/components/StatsOverviewCards";
import SystemStatusWidget from "@/components/SystemStatusWidget";
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
  const [warning, setWarning] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    const [portfolioResult, cbResult, tradesResult] = await Promise.allSettled([
      fetchPortfolioState(),
      fetchCircuitBreakerState(),
      fetchTrades(undefined, 3),
    ]);

    const failedSections: string[] = [];

    if (portfolioResult.status === "fulfilled") {
      setPortfolio(portfolioResult.value);
    } else {
      setPortfolio(null);
      failedSections.push("portfolio");
    }

    if (cbResult.status === "fulfilled") {
      setCb(cbResult.value);
    } else {
      setCb(null);
      failedSections.push("circuit breaker");
    }

    if (tradesResult.status === "fulfilled") {
      setTrades(tradesResult.value);
    } else {
      setTrades([]);
      failedSections.push("recent trades");
    }

    if (failedSections.length === 3) {
      setError("Failed to load dashboard data.");
    } else if (failedSections.length > 0) {
      setWarning(
        `Some sections failed to load: ${failedSections.join(", ")}. Showing available data.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" role="alert" aria-live="assertive">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-zinc-500 text-xs mt-1">
            API server response could not be retrieved.
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            Make sure the API server is running
          </p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Retry
          </button>
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

      {warning && (
        <div
          className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          role="status"
          aria-live="polite"
        >
          {warning}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          System Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SystemStatusWidget />
          <div className="lg:col-span-2">
            <StatsOverviewCards />
          </div>
        </div>
      </section>

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
              <Link
                key={trade.id}
                href={`/trades?tradeId=${trade.id}`}
                className="px-5 py-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors cursor-pointer"
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
