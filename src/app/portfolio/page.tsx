"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchPortfolioState, fetchEquityCurve, fetchStrategyPerformance } from "@/lib/api";
import DetailPanel from "@/components/DetailPanel";
import DetailRow from "@/components/DetailRow";
import ExecutionModeFilter, {
  useExecutionMode,
} from "@/components/ExecutionModeFilter";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { EquityCurveResponse, StrategyPerformance } from "@/types";
import { formatCurrency, formatPercent, formatPnl, colorByPnl, formatTimestamp } from "@/lib/format";
import { fillEquityCurveGaps } from "@/lib/chartUtils";
const DailyPnlChart = dynamic(() => import("@/components/DailyPnlChart"), { ssr: false });
const StrategyAllocationPie = dynamic(() => import("@/components/StrategyAllocationPie"), { ssr: false });

interface StrategyEntry {
  id: string;
  symbol: string;
  strategy: string;
  allocation_pct: number;
  equity: number;
  initial_equity: number;
  pnl: number;
  pnl_pct: number;
  position_count: number | null;
  last_signal_time: string | null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseStrategies(data: Record<string, unknown>): {
  strategies: StrategyEntry[];
  totalEquity: number;
  lastUpdated: string | null;
} {
  const strategies: StrategyEntry[] = [];
  const totalFromApi =
    toNumber(data.total_balance) ??
    toNumber(data.equity) ??
    toNumber(data.total_equity);
  let totalEquity = totalFromApi ?? 0;
  let derivedTotalEquity = 0;
  let lastUpdated: string | null = null;

  if (typeof data.last_updated === "string") {
    lastUpdated = data.last_updated;
  }

  if (lastUpdated == null && typeof data.timestamp === "string") {
    lastUpdated = data.timestamp;
  }

  const strats =
    (data.strategies as Record<string, Record<string, unknown>> | undefined) ??
    (data.positions as Record<string, Record<string, unknown>> | undefined);

  if (strats && typeof strats === "object") {
    for (const [id, s] of Object.entries(strats)) {
      const equity = toNumber(s.equity) ?? 0;
      const initial = toNumber(s.initial_equity) ?? equity;
      const pnl = equity - initial;
      const pnlPct = initial > 0 ? (pnl / initial) * 100 : 0;

      strategies.push({
        id,
        symbol: String(s.symbol ?? id.replace(/_/g, " ").toUpperCase()),
        strategy: String(s.strategy ?? "unknown"),
        allocation_pct: toNumber(s.allocation_pct) ?? 0,
        equity,
        initial_equity: initial,
        pnl,
        pnl_pct: pnlPct,
        position_count:
          typeof s.position_count === "number"
            ? s.position_count
            : null,
        last_signal_time:
          typeof s.last_signal_time === "string"
            ? s.last_signal_time
            : null,
      });

      derivedTotalEquity += equity;
    }
  }

  if (totalFromApi == null && derivedTotalEquity > 0) {
    totalEquity = derivedTotalEquity;
  }

  return { strategies, totalEquity, lastUpdated };
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading portfolio..." />}>
      <PortfolioContent />
    </Suspense>
  );
}

function PortfolioContent() {
  const [strategies, setStrategies] = useState<StrategyEntry[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyEntry | null>(null);
  const [totalEquity, setTotalEquity] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityCurveResponse | null>(null);
  const [strategyPerf, setStrategyPerf] = useState<StrategyPerformance[]>([]);
  const { apiExecutionMode } = useExecutionMode();

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    setSelectedStrategy(null);

    const [stateResult, curveResult, perfResult] = await Promise.allSettled([
      fetchPortfolioState(apiExecutionMode),
      fetchEquityCurve(undefined, undefined, apiExecutionMode),
      fetchStrategyPerformance(apiExecutionMode),
    ]);

    if (stateResult.status !== "fulfilled") {
      setStrategies([]);
      setTotalEquity(0);
      setLastUpdated(null);
      setEquityCurve(null);
      setStrategyPerf([]);
      setError(
        stateResult.reason instanceof Error
          ? stateResult.reason.message
          : "Failed to load portfolio state"
      );
      setLoading(false);
      return;
    }

    const parsed = parseStrategies(stateResult.value.data);
    setStrategies(parsed.strategies);
    setTotalEquity(parsed.totalEquity);
    setLastUpdated(parsed.lastUpdated);

    const failedSections: string[] = [];

    if (curveResult.status === "fulfilled") {
      const filled = curveResult.value
        ? { ...curveResult.value, data: fillEquityCurveGaps(curveResult.value.data ?? []) }
        : null;
      setEquityCurve(filled);
    } else {
      setEquityCurve(null);
      failedSections.push("daily PnL chart");
    }

    if (perfResult.status === "fulfilled") {
      setStrategyPerf(perfResult.value ?? []);
    } else {
      setStrategyPerf([]);
      failedSections.push("strategy performance");
    }

    if (failedSections.length > 0) {
      setWarning(
        `Some sections failed to load: ${failedSections.join(", ")}. Showing available data.`
      );
    }

    setLoading(false);
  }, [apiExecutionMode]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  if (loading) {
    return <LoadingSpinner label="Loading portfolio..." />;
  }

  const pageHeader = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-xl font-bold text-zinc-100">Portfolio</h1>
      <ExecutionModeFilter />
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="flex items-center justify-center h-full">
          <div className="text-center" role="alert" aria-live="assertive">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-zinc-600 text-xs mt-1">
              Make sure the API server is running on port 8000
            </p>
            <button
              type="button"
              onClick={() => void loadPortfolio()}
              className="mt-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPnl = strategies.reduce((sum, s) => sum + s.pnl, 0);
  const totalInitial = strategies.reduce((sum, s) => sum + s.initial_equity, 0);
  const totalPnlPct = totalInitial > 0 ? (totalPnl / totalInitial) * 100 : 0;

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">
            Daily PnL
          </h3>
          <DailyPnlChart
            data={
              equityCurve?.data?.map((d) => ({
                date: d.date,
                daily_pnl: d.daily_pnl ?? 0,
              })) ?? []
            }
          />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-300 mb-3">
            Strategy Allocation
          </h3>
          <StrategyAllocationPie
            data={
              strategies.length > 0
                ? strategies.map((s) => ({
                    name: `${s.symbol} ${s.strategy}`,
                    value: s.allocation_pct,
                  }))
                : strategyPerf.map((s) => ({
                    name: s.strategy,
                    value: s.trade_count,
                  }))
            }
          />
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
            <table className="w-full text-sm" aria-label="Strategy allocations table">
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
                    onClick={() => setSelectedStrategy(s)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
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

      <DetailPanel
        isOpen={selectedStrategy != null}
        onClose={() => setSelectedStrategy(null)}
        title="Strategy Details"
      >
        {selectedStrategy && (
          <div className="space-y-3 text-sm">
            <DetailRow
              label="Strategy Name"
              value={selectedStrategy.strategy}
            />
            <DetailRow
              label="Symbol"
              value={selectedStrategy.symbol}
            />
            <DetailRow
              label="Allocation %"
              value={formatPercent(selectedStrategy.allocation_pct, 1)}
            />
            <DetailRow
              label="Current Value"
              value={formatCurrency(selectedStrategy.equity)}
            />
            <DetailRow
              label="PnL"
              value={formatPnl(selectedStrategy.pnl)}
            />
            <DetailRow
              label="PnL %"
              value={`${formatPnl(selectedStrategy.pnl_pct)}%`}
            />
            <DetailRow
              label="Position Count"
              value={
                selectedStrategy.position_count != null
                  ? String(selectedStrategy.position_count)
                  : "—"
              }
            />
            <DetailRow
              label="Last Signal Time"
              value={
                selectedStrategy.last_signal_time
                  ? formatTimestamp(selectedStrategy.last_signal_time)
                  : "—"
              }
            />
          </div>
        )}
      </DetailPanel>
    </div>
  );
}
