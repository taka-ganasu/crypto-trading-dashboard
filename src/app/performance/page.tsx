"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  fetchPerformanceSummary,
  fetchExecutionQuality,
  fetchMarketSnapshots,
  fetchEquityCurve,
  fetchTradesByStrategy,
} from "@/lib/api";
const CumulativePnlChart = dynamic(() => import("@/components/CumulativePnlChart"), { ssr: false });
const DailyStrategyPnlChart = dynamic(() => import("@/components/DailyStrategyPnlChart"), { ssr: false });
import DetailPanel from "@/components/DetailPanel";
import DetailRow from "@/components/DetailRow";
const EquityCurveChart = dynamic(() => import("@/components/EquityCurveChart"), { ssr: false });
import ExecutionModeFilter, {
  useExecutionMode,
} from "@/components/ExecutionModeFilter";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  formatNumber,
  formatPercent,
  formatPnl,
  colorByPnl,
  formatPrice,
  formatTimestamp,
} from "@/lib/format";
import { fillEquityCurveGaps, fillStrategyPnlGaps } from "@/lib/chartUtils";
import type {
  PerformanceSummary,
  ExecutionQuality,
  MarketSnapshot,
  EquityCurvePoint,
  TradeByStrategyDaily,
} from "@/types";

function slippageColor(pct: number | null | undefined): string {
  if (pct == null) return "text-zinc-500";
  if (pct > 0.5) return "text-red-400";
  if (pct >= 0.1) return "text-yellow-400";
  return "text-emerald-400";
}

function rsiColor(rsi: number | null | undefined): string {
  if (rsi == null) return "text-zinc-500";
  if (rsi > 70) return "text-red-400";
  if (rsi < 30) return "text-emerald-400";
  return "text-zinc-300";
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading performance data..." />}>
      <PerformanceContent />
    </Suspense>
  );
}

function PerformanceContent() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [execQuality, setExecQuality] = useState<ExecutionQuality[]>([]);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [equityCurve, setEquityCurve] = useState<EquityCurvePoint[]>([]);
  const [equityInitialBalance, setEquityInitialBalance] = useState<number | null>(null);
  const [dailyStrategyPnl, setDailyStrategyPnl] = useState<TradeByStrategyDaily[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { apiExecutionMode } = useExecutionMode();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    const tzOffset = -new Date().getTimezoneOffset() / 60;

    const [summaryResult, eqResult, snapshotsResult, curveResult, strategyPnlResult] =
      await Promise.allSettled([
        fetchPerformanceSummary(apiExecutionMode),
        fetchExecutionQuality(50, apiExecutionMode),
        fetchMarketSnapshots(20, apiExecutionMode),
        fetchEquityCurve(undefined, undefined, apiExecutionMode, tzOffset),
        fetchTradesByStrategy(undefined, undefined, apiExecutionMode, tzOffset),
      ]);

    const failedSections: string[] = [];
    let successCount = 0;

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
      successCount += 1;
    } else {
      setSummary(null);
      failedSections.push("summary");
    }

    if (eqResult.status === "fulfilled") {
      setExecQuality(eqResult.value);
      successCount += 1;
    } else {
      setExecQuality([]);
      failedSections.push("execution quality");
    }

    if (snapshotsResult.status === "fulfilled") {
      setSnapshots(snapshotsResult.value);
      successCount += 1;
    } else {
      setSnapshots([]);
      failedSections.push("market snapshots");
    }

    if (curveResult.status === "fulfilled") {
      setEquityCurve(fillEquityCurveGaps(curveResult.value.data ?? []));
      setEquityInitialBalance(curveResult.value.initial_balance ?? null);
      successCount += 1;
    } else {
      setEquityCurve([]);
      setEquityInitialBalance(null);
      failedSections.push("equity curve");
    }

    if (strategyPnlResult.status === "fulfilled") {
      setDailyStrategyPnl(fillStrategyPnlGaps(strategyPnlResult.value));
      successCount += 1;
    } else {
      setDailyStrategyPnl([]);
      failedSections.push("daily strategy pnl");
    }

    if (successCount === 0) {
      setError("Failed to load performance data.");
    } else if (failedSections.length > 0) {
      setWarning(
        `Some sections failed to load: ${failedSections.join(", ")}. Showing available data.`
      );
    }

    setLoading(false);
  }, [apiExecutionMode]);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      await loadData();
      if (cancelled) return;
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  if (loading) {
    return <LoadingSpinner label="Loading performance data..." />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center" role="alert" aria-live="assertive">
          <p className="text-red-400">Error: {error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const latestBalance = equityCurve[equityCurve.length - 1]?.balance ?? null;
  const initialBalance = equityInitialBalance ?? summary?.initial_balance ?? null;
  const cumulativePnlPct =
    initialBalance != null &&
    initialBalance > 0 &&
    latestBalance != null
      ? ((latestBalance - initialBalance) / initialBalance) * 100
      : null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-zinc-100">Performance</h1>
          <ExecutionModeFilter />
        </div>
      </div>

      {warning && (
        <div
          className="mb-6 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          role="status"
          aria-live="polite"
        >
          {warning}
        </div>
      )}

      {summary && (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Total PnL</p>
            <p
              className={`mt-1 text-2xl font-mono font-bold ${colorByPnl(summary.total_pnl ?? 0)}`}
            >
              {formatPnl(summary.total_pnl ?? 0)}
              {cumulativePnlPct != null ? (
                <span className="ml-2 text-base font-medium text-zinc-300">
                  ({formatPercent(cumulativePnlPct)})
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Win Rate</p>
            <p className="mt-1 text-2xl font-mono font-bold text-zinc-100">
              {summary.win_rate != null ? formatPercent(summary.win_rate * 100, 1) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Profit Factor</p>
            <p className="mt-1 text-2xl font-mono font-bold text-zinc-100">
              {summary.profit_factor != null ? summary.profit_factor.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Avg Slippage</p>
            <p
              className={`mt-1 text-2xl font-mono font-bold ${slippageColor(summary.avg_slippage ?? 0)}`}
            >
              {summary.avg_slippage != null ? formatPercent(summary.avg_slippage, 3) : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Cumulative PnL</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <CumulativePnlChart
            data={equityCurve.map((p) => ({
              date: p.date,
              cumulative_pnl: p.cumulative_pnl ?? 0,
              daily_pnl: p.daily_pnl ?? 0,
            }))}
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Equity Curve</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <EquityCurveChart data={equityCurve} />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Daily PnL by Strategy</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <DailyStrategyPnlChart data={dailyStrategyPnl} />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Execution Quality</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm" aria-label="Execution quality table">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Trade ID</th>
                <th className="px-4 py-3 text-right">Expected Price</th>
                <th className="px-4 py-3 text-right">Actual Price</th>
                <th className="px-4 py-3 text-right">Slippage %</th>
                <th className="px-4 py-3 text-right">Latency (ms)</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {execQuality.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No execution data
                  </td>
                </tr>
              ) : (
                execQuality.map((eq) => (
                  <tr
                    key={`${eq.trade_id ?? "unknown"}-${eq.timestamp}`}
                    onClick={() => setSelectedExecution(eq)}
                    className="cursor-pointer transition-colors hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">{eq.trade_id != null ? `#${eq.trade_id}` : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {formatPrice(eq.expected_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {formatPrice(eq.actual_price)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${slippageColor(eq.slippage_pct)}`}>
                      {eq.slippage_pct != null ? `${eq.slippage_pct.toFixed(3)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">{eq.api_latency_ms ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatTimestamp(eq.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DetailPanel
          isOpen={selectedExecution != null}
          onClose={() => setSelectedExecution(null)}
          title="Execution Quality Details"
        >
          {selectedExecution && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Trade ID" value={selectedExecution.trade_id != null ? `#${selectedExecution.trade_id}` : "—"} />
              <DetailRow label="Expected Price" value={formatPrice(selectedExecution.expected_price)} />
              <DetailRow label="Actual Price" value={formatPrice(selectedExecution.actual_price)} />
              <DetailRow
                label="Slippage"
                value={selectedExecution.actual_price != null && selectedExecution.expected_price != null
                  ? (selectedExecution.actual_price - selectedExecution.expected_price).toFixed(6)
                  : "—"}
              />
              <DetailRow label="Slippage %" value={selectedExecution.slippage_pct != null ? `${selectedExecution.slippage_pct.toFixed(3)}%` : "—"} />
              <DetailRow label="Timestamp" value={formatTimestamp(selectedExecution.timestamp)} />
            </div>
          )}
        </DetailPanel>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Market Snapshots</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm" aria-label="Market snapshots table">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">RSI</th>
                <th className="px-4 py-3 text-right">ADX</th>
                <th className="px-4 py-3 text-right">MACD</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {snapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No snapshots
                  </td>
                </tr>
              ) : (
                snapshots.map((snap, i) => (
                  <tr
                    key={`${snap.symbol}-${snap.timestamp}-${i}`}
                    className="transition-colors hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">{snap.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {snap.price != null ? formatNumber(snap.price) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${rsiColor(snap.rsi)}`}>
                      {snap.rsi != null ? snap.rsi.toFixed(1) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {snap.adx != null ? snap.adx.toFixed(1) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {snap.macd != null ? snap.macd.toFixed(4) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {snap.volume != null ? snap.volume.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatTimestamp(snap.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
