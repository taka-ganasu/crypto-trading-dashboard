"use client";

import { useEffect, useState } from "react";
import {
  fetchStrategies,
  fetchStrategyPerformance,
  fetchSystemStatsOverview,
} from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { colorByPnl, formatPercent, formatPnl } from "@/lib/format";
import type {
  StrategyPerformance,
  StrategySnapshot,
  SystemStatsResponse,
} from "@/types";

interface StrategyRow {
  id: string;
  symbol: string;
  strategy: string;
  status: string;
  allocation_pct: number;
  trade_count: number;
  win_rate: number | null;
  recent_pnl: number | null;
  profit_factor: number | null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeSnapshot(snapshot: StrategySnapshot): StrategyRow {
  return {
    id: snapshot.id,
    symbol: snapshot.symbol,
    strategy: snapshot.strategy,
    status: snapshot.status,
    allocation_pct: toNumber(snapshot.allocation_pct) ?? 0,
    trade_count: Math.max(0, Math.floor(toNumber(snapshot.trade_count) ?? 0)),
    win_rate: toNumber(snapshot.win_rate),
    recent_pnl: toNumber(snapshot.recent_pnl),
    profit_factor: null,
  };
}

function buildFallbackRows(stats: SystemStatsResponse): StrategyRow[] {
  const configs = Array.isArray(stats.strategy_config) ? stats.strategy_config : [];
  return configs.map((cfg) => {
    const allocationPct = toNumber(cfg.allocation_pct) ?? 0;
    return {
      id: cfg.id,
      symbol: cfg.symbol,
      strategy: cfg.strategy,
      status: allocationPct > 0 ? "active" : "disabled",
      allocation_pct: allocationPct,
      trade_count: 0,
      win_rate: null,
      recent_pnl: null,
      profit_factor: null,
    };
  });
}

function mergePerformance(
  baseRows: StrategyRow[],
  performanceRows: StrategyPerformance[]
): StrategyRow[] {
  const perfByStrategy = new Map(
    performanceRows.map((row) => [row.strategy, row])
  );

  if (baseRows.length > 0) {
    return baseRows.map((base) => {
      const perf = perfByStrategy.get(base.strategy);
      return {
        ...base,
        trade_count: perf?.trade_count ?? base.trade_count,
        win_rate: perf?.win_rate ?? base.win_rate,
        recent_pnl: base.recent_pnl ?? perf?.avg_pnl ?? null,
        profit_factor: perf?.profit_factor ?? null,
      };
    });
  }

  return performanceRows.map((perf, index) => ({
    id: `perf_${index + 1}`,
    symbol: "—",
    strategy: perf.strategy,
    status: "active",
    allocation_pct: 0,
    trade_count: perf.trade_count,
    win_rate: perf.win_rate,
    recent_pnl: perf.avg_pnl,
    profit_factor: perf.profit_factor,
  }));
}

function statusClass(status: string): string {
  const lower = status.toLowerCase();
  if (lower === "active") {
    return "bg-emerald-950/50 text-emerald-400 border border-emerald-700/40";
  }
  if (lower === "disabled") {
    return "bg-zinc-800 text-zinc-400 border border-zinc-700";
  }
  return "bg-yellow-950/40 text-yellow-300 border border-yellow-700/40";
}

export default function StrategiesPage() {
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [activePlan, setActivePlan] = useState<string>("unknown");
  const [sourceLabel, setSourceLabel] = useState<string>("/api/strategies");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setWarning(null);

      const [strategiesResult, performanceResult, statsResult] =
        await Promise.allSettled([
          fetchStrategies(),
          fetchStrategyPerformance(),
          fetchSystemStatsOverview(),
        ]);

      const warningParts: string[] = [];
      if (strategiesResult.status !== "fulfilled") warningParts.push("/api/strategies");
      if (performanceResult.status !== "fulfilled") warningParts.push("/api/performance/by-strategy");
      if (statsResult.status !== "fulfilled") warningParts.push("/api/system/stats");

      const performanceRows =
        performanceResult.status === "fulfilled" ? performanceResult.value : [];

      let baseRows: StrategyRow[] = [];
      let nextPlan = "unknown";
      let nextSource = "/api/strategies";

      if (
        strategiesResult.status === "fulfilled" &&
        Array.isArray(strategiesResult.value.strategies) &&
        strategiesResult.value.strategies.length > 0
      ) {
        baseRows = strategiesResult.value.strategies.map(normalizeSnapshot);
        nextPlan = strategiesResult.value.active_plan ?? "unknown";
      } else if (
        statsResult.status === "fulfilled" &&
        Array.isArray(statsResult.value.strategy_config) &&
        statsResult.value.strategy_config.length > 0
      ) {
        baseRows = buildFallbackRows(statsResult.value);
        nextPlan = statsResult.value.active_plan ?? "unknown";
        nextSource = "fallback: /api/system/stats";
      }

      const mergedRows = mergePerformance(baseRows, performanceRows);

      if (mergedRows.length === 0) {
        setError("No strategy data available from API.");
      } else {
        setRows(mergedRows);
        setActivePlan(nextPlan);
        setSourceLabel(nextSource);
        if (warningParts.length > 0) {
          setWarning(
            `Some sources failed to load: ${warningParts.join(", ")}. Showing available data.`
          );
        }
      }

      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading strategy data..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" role="alert" aria-live="assertive">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-zinc-500 text-xs mt-1">
            Ensure the bot API server is running and reachable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Strategies</h1>
          <p className="text-xs text-zinc-500 mt-1">Source: {sourceLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-300">Active Plan: {activePlan}</p>
          <p className="text-xs text-zinc-500">{rows.length} strategies</p>
        </div>
      </div>

      {warning && (
        <div
          className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          role="status"
          aria-live="polite"
        >
          {warning}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
        <table className="w-full text-sm" aria-label="Strategies table">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">Symbol</th>
              <th className="text-left px-4 py-3 font-medium">Strategy</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Allocation %</th>
              <th className="text-right px-4 py-3 font-medium">Recent PnL</th>
              <th className="text-right px-4 py-3 font-medium">Trades</th>
              <th className="text-right px-4 py-3 font-medium">Win Rate</th>
              <th className="text-right px-4 py-3 font-medium">PF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/60">
                <td className="px-4 py-3 font-mono text-zinc-200">{row.id}</td>
                <td className="px-4 py-3 text-zinc-300">{row.symbol}</td>
                <td className="px-4 py-3 text-zinc-300">{row.strategy}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(
                      row.status
                    )}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-200">
                  {formatPercent(row.allocation_pct, 1)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${
                    row.recent_pnl != null
                      ? colorByPnl(row.recent_pnl)
                      : "text-zinc-500"
                  }`}
                >
                  {row.recent_pnl != null ? formatPnl(row.recent_pnl) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {row.trade_count}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {row.win_rate != null ? formatPercent(row.win_rate * 100, 1) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {row.profit_factor != null ? row.profit_factor.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
