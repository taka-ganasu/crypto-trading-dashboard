"use client";

import { useEffect, useState } from "react";
import {
  fetchPerformanceSummary,
  fetchExecutionQuality,
  fetchMarketSnapshots,
} from "@/lib/api";
import { formatNumber, formatPercent, formatPnl, colorByPnl, formatTimestamp } from "@/lib/format";
import type {
  PerformanceSummary,
  ExecutionQuality,
  MarketSnapshot,
} from "@/types";

function slippageColor(pct: number): string {
  if (pct > 0.5) return "text-red-400";
  if (pct >= 0.1) return "text-yellow-400";
  return "text-emerald-400";
}

function rsiColor(rsi: number | null): string {
  if (rsi == null) return "text-zinc-500";
  if (rsi > 70) return "text-red-400";
  if (rsi < 30) return "text-emerald-400";
  return "text-zinc-300";
}

export default function PerformancePage() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [execQuality, setExecQuality] = useState<ExecutionQuality[]>([]);
  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchPerformanceSummary(),
      fetchExecutionQuality(50),
      fetchMarketSnapshots(20),
    ])
      .then(([s, eq, ms]) => {
        setSummary(s);
        setExecQuality(eq);
        setSnapshots(ms);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Loading performance data...</p>
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Performance</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Total PnL
            </p>
            <p
              className={`mt-1 text-2xl font-mono font-bold ${colorByPnl(summary.total_pnl ?? 0)}`}
            >
              {formatPnl(summary.total_pnl ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Win Rate
            </p>
            <p className="mt-1 text-2xl font-mono font-bold text-zinc-100">
              {summary.win_rate != null ? formatPercent(summary.win_rate * 100, 1) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Profit Factor
            </p>
            <p className="mt-1 text-2xl font-mono font-bold text-zinc-100">
              {summary.profit_factor != null ? summary.profit_factor.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Avg Slippage
            </p>
            <p
              className={`mt-1 text-2xl font-mono font-bold ${slippageColor(
                summary.avg_slippage ?? 0
              )}`}
            >
              {summary.avg_slippage != null ? formatPercent(summary.avg_slippage, 3) : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Execution Quality Table */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          Execution Quality
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
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
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No execution data
                  </td>
                </tr>
              ) : (
                execQuality.map((eq) => (
                  <tr
                    key={`${eq.trade_id}-${eq.timestamp}`}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      #{eq.trade_id}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {eq.expected_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {eq.actual_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${slippageColor(
                        eq.slippage_pct
                      )}`}
                    >
                      {eq.slippage_pct.toFixed(3)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {eq.api_latency_ms}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatTimestamp(eq.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Snapshots Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">
          Market Snapshots
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
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
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No snapshots
                  </td>
                </tr>
              ) : (
                snapshots.map((snap, i) => (
                  <tr
                    key={`${snap.symbol}-${snap.timestamp}-${i}`}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {snap.symbol}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {snap.price != null ? formatNumber(snap.price) : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${rsiColor(
                        snap.rsi
                      )}`}
                    >
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
                    <td className="px-4 py-3 text-zinc-400">
                      {formatTimestamp(snap.timestamp)}
                    </td>
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
