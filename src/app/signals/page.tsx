"use client";

import { useEffect, useState } from "react";
import { fetchSignals } from "@/lib/api";
import type { Signal } from "@/types";

function actionBadge(action: string) {
  const lower = action.toLowerCase();
  if (lower === "buy")
    return "inline-block rounded px-2 py-0.5 text-xs font-medium bg-emerald-900/50 text-emerald-400";
  if (lower === "sell")
    return "inline-block rounded px-2 py-0.5 text-xs font-medium bg-red-900/50 text-red-400";
  return "inline-block rounded px-2 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-400";
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignals(undefined, 100)
      .then(setSignals)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Loading signals...</p>
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

  const total = signals.length;
  const executedCount = signals.filter((s) => s.executed === 1).length;
  const executionRate = total > 0 ? ((executedCount / total) * 100).toFixed(1) : "0.0";
  const avgConfidence =
    total > 0
      ? (
          signals.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / total
        ).toFixed(1)
      : "0.0";

  const stats = [
    { label: "Total Signals", value: total },
    { label: "Executed", value: executedCount },
    { label: "Execution Rate", value: `${executionRate}%` },
    { label: "Avg Confidence", value: `${avgConfidence}%` },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Signals</h1>
        <span className="text-sm text-zinc-500">{total} signals</span>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-bold font-mono text-zinc-100">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Signal History Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Confidence</th>
              <th className="px-4 py-3 text-center">Executed</th>
              <th className="px-4 py-3">Skip Reason</th>
              <th className="px-4 py-3">Strategy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {signals.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  No signals found
                </td>
              </tr>
            ) : (
              signals.map((sig) => (
                <tr
                  key={sig.id}
                  className="hover:bg-zinc-900/50 transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(sig.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {sig.symbol}
                  </td>
                  <td className="px-4 py-3">
                    <span className={actionBadge(sig.action)}>
                      {sig.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {sig.score != null ? sig.score.toFixed(3) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {sig.confidence != null
                      ? `${sig.confidence.toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sig.executed === 1 ? (
                      <span className="text-emerald-400">&#10003;</span>
                    ) : (
                      <span className="text-zinc-600">&#10007;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {sig.skip_reason ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {sig.strategy_type ?? "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
