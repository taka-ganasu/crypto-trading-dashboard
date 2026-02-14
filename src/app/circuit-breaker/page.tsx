"use client";

import { useEffect, useState } from "react";
import { fetchCircuitBreakerState } from "@/lib/api";
import type { CircuitBreakerState } from "@/types";

type CBStatus = "NORMAL" | "WARNING" | "PAUSED" | "STOPPED";

const STATUS_CONFIG: Record<
  CBStatus,
  { color: string; bg: string; border: string; description: string }
> = {
  NORMAL: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    description: "All systems operational. Trading is active.",
  },
  WARNING: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    description:
      "Consecutive loss threshold reached. Leverage reduced automatically.",
  },
  PAUSED: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    description:
      "Further losses detected. Positions reduced by 50% and new trades halted.",
  },
  STOPPED: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    description:
      "Critical threshold exceeded. All positions closed and system shut down. Manual restart required.",
  },
};

const TRANSITIONS = [
  {
    from: "NORMAL" as CBStatus,
    to: "WARNING" as CBStatus,
    trigger: "Consecutive loss threshold reached",
    action: "Leverage is automatically reduced",
  },
  {
    from: "WARNING" as CBStatus,
    to: "PAUSED" as CBStatus,
    trigger: "Further losses beyond WARNING threshold",
    action: "Positions reduced by 50%, new trades halted",
  },
  {
    from: "PAUSED" as CBStatus,
    to: "STOPPED" as CBStatus,
    trigger: "Critical drawdown limit exceeded",
    action: "All positions closed, system shutdown",
  },
  {
    from: "WARNING" as CBStatus,
    to: "NORMAL" as CBStatus,
    trigger: "Gradual recovery over 12 hours",
    action: "Leverage restored (75% → 100%)",
  },
  {
    from: "PAUSED" as CBStatus,
    to: "WARNING" as CBStatus,
    trigger: "Gradual recovery over 12 hours",
    action: "New trades re-enabled at reduced leverage",
  },
];

function StatusBadge({ status }: { status: CBStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold ${config.color} ${config.bg} border ${config.border}`}
    >
      <span
        className={`h-3 w-3 rounded-full ${status === "NORMAL" ? "bg-emerald-400" : status === "WARNING" ? "bg-yellow-400" : status === "PAUSED" ? "bg-orange-400" : "bg-red-400"}`}
      />
      {status}
    </span>
  );
}

function TransitionArrow({ from, to }: { from: CBStatus; to: CBStatus }) {
  const fromConfig = STATUS_CONFIG[from];
  const toConfig = STATUS_CONFIG[to];
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-medium ${fromConfig.color}`}>{from}</span>
      <span className="text-zinc-600">→</span>
      <span className={`font-medium ${toConfig.color}`}>{to}</span>
    </div>
  );
}

export default function CircuitBreakerPage() {
  const [cbState, setCbState] = useState<CircuitBreakerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const state = await fetchCircuitBreakerState();
        if (!cancelled) {
          setCbState(state);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const currentStatus: CBStatus =
    (cbState?.data?.status as CBStatus) ?? "NORMAL";
  const config = STATUS_CONFIG[currentStatus];
  const events = (cbState?.data?.recent_events as Array<Record<string, string>>) ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Circuit Breaker</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Safety mechanism that automatically reduces risk during adverse
          conditions
        </p>
      </div>

      {/* Current Status */}
      <div
        className={`rounded-xl border ${config.border} ${config.bg} p-6`}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
          Current Status
        </p>
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 animate-pulse rounded-full bg-zinc-800" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-400">
            <p>Failed to load circuit breaker state</p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
          </div>
        ) : (
          <>
            <StatusBadge status={currentStatus} />
            <p className={`mt-3 text-sm ${config.color}`}>
              {config.description}
            </p>
          </>
        )}
      </div>

      {/* State Transitions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          State Transitions
        </h2>
        <div className="space-y-4">
          {TRANSITIONS.map((t, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="shrink-0 pt-0.5">
                <TransitionArrow from={t.from} to={t.to} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-zinc-300">{t.trigger}</p>
                <p className="text-xs text-zinc-500 mt-1">{t.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          Recent Events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No circuit breaker events recorded
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <StatusBadge
                  status={(event.status as CBStatus) ?? "NORMAL"}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300 truncate">
                    {event.message ?? "State change"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {event.timestamp ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
