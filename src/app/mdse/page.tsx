"use client";

import { useEffect, useState } from "react";
import {
  fetchMdseScores,
  fetchMdseEvents,
  fetchMdseTrades,
} from "@/lib/api";
import type { MdseDetectorScore, MdseEvent, MdseTrade } from "@/types";

function winRateColor(rate: number): string {
  if (rate > 50) return "text-emerald-400";
  if (rate < 30) return "text-red-400";
  return "text-yellow-400";
}

function winRateBorder(rate: number): string {
  if (rate > 50) return "border-emerald-500/30";
  if (rate < 30) return "border-red-500/30";
  return "border-yellow-500/30";
}

export default function MdsePage() {
  const [scores, setScores] = useState<MdseDetectorScore[]>([]);
  const [events, setEvents] = useState<MdseEvent[]>([]);
  const [trades, setTrades] = useState<MdseTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchMdseScores(), fetchMdseEvents(24), fetchMdseTrades(20)])
      .then(([s, e, t]) => {
        setScores(s);
        setEvents(e);
        setTrades(t);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Loading MDSE data...</p>
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
    <div className="space-y-8">
      {/* Detector Status Cards */}
      <section>
        <h1 className="text-xl font-bold text-zinc-100 mb-4">
          MDSE Detector Status
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scores.map((d) => (
            <div
              key={d.detector_name}
              className={`rounded-lg border bg-zinc-900 p-4 ${winRateBorder(d.win_rate)}`}
            >
              <h2 className="text-sm font-semibold text-zinc-300 mb-3 truncate">
                {d.detector_name}
              </h2>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-zinc-500">Win Rate</span>
                <span className={`text-right font-mono ${winRateColor(d.win_rate)}`}>
                  {d.win_rate.toFixed(1)}%
                </span>
                <span className="text-zinc-500">Avg PnL</span>
                <span
                  className={`text-right font-mono ${
                    d.avg_pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {d.avg_pnl >= 0 ? "+" : ""}
                  {d.avg_pnl.toFixed(2)}
                </span>
                <span className="text-zinc-500">Weight</span>
                <span className="text-right font-mono text-zinc-300">
                  {d.weight.toFixed(2)}
                </span>
                <span className="text-zinc-500">Samples</span>
                <span className="text-right font-mono text-zinc-300">
                  {d.sample_count}
                </span>
              </div>
            </div>
          ))}
          {scores.length === 0 && (
            <p className="col-span-full text-center text-zinc-500 py-8">
              No detector scores available
            </p>
          )}
        </div>
      </section>

      {/* Recent Events Timeline (24h) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-100">
            Recent Events (24h)
          </h2>
          <span className="text-sm text-zinc-500">
            {events.length} events
          </span>
        </div>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">
              No events in the last 24 hours
            </p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {ev.detector}
                </span>
                <span className="text-sm font-medium text-zinc-200 w-20">
                  {ev.symbol}
                </span>
                <span
                  className={`text-sm font-medium w-14 ${
                    ev.direction === "long"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {ev.direction.toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className={`h-2 rounded-full ${
                        ev.confidence >= 70
                          ? "bg-emerald-500"
                          : ev.confidence >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(ev.confidence, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-mono text-zinc-500">
                  {ev.confidence.toFixed(0)}%
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MDSE Trades Table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-100">MDSE Trades</h2>
          <span className="text-sm text-zinc-500">
            {trades.length} trades
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3 text-right">Entry Price</th>
                <th className="px-4 py-3 text-right">Exit Price</th>
                <th className="px-4 py-3 text-right">PnL</th>
                <th className="px-4 py-3 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {trades.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No MDSE trades found
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr
                    key={t.event_id}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      #{t.event_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {t.symbol}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          t.direction === "long"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {t.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.entry_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.exit_price != null
                        ? t.exit_price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {t.pnl != null ? (
                        <span
                          className={
                            t.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {t.pnl >= 0 ? "+" : ""}
                          {t.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.position_size.toFixed(4)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
