"use client";

import { useMemo } from "react";
import { formatTimestamp } from "@/lib/format";
import type { SystemStatsResponse } from "@/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readPath(payload: SystemStatsResponse | null, path: string[]): unknown {
  if (!payload) return null;
  let cursor: unknown = payload;
  for (const key of path) {
    const obj = asRecord(cursor);
    if (!obj || !(key in obj)) {
      return null;
    }
    cursor = obj[key];
  }
  return cursor;
}

function readNumber(payload: SystemStatsResponse | null, paths: string[][]): number | null {
  if (!payload) return null;

  for (const path of paths) {
    const value = asNumber(readPath(payload, path));
    if (value != null) {
      return value;
    }
  }

  return null;
}

function readText(payload: SystemStatsResponse | null, paths: string[][]): string | null {
  if (!payload) return null;

  for (const path of paths) {
    const value = asString(readPath(payload, path));
    if (value) {
      return value;
    }
  }

  return null;
}


interface StatsOverviewCardsProps {
  stats: SystemStatsResponse | null;
  loading: boolean;
  error: string | null;
}

export default function StatsOverviewCards({ stats, loading, error }: StatsOverviewCardsProps) {
  const view = useMemo(() => {
    const recentTrades = readNumber(stats, [
      ["recent_trades"],
      ["trades_24h"],
      ["trade_count"],
      ["db_stats", "total_trades"],
    ]);
    const recentSignals = readNumber(stats, [
      ["recent_signals"],
      ["signals_24h"],
      ["signal_count"],
      ["db_stats", "total_signals"],
    ]);
    const mdseEvents = readNumber(stats, [
      ["recent_mdse_events"],
      ["mdse_events"],
      ["mdse_event_count"],
      ["events_24h"],
      ["db_stats", "total_distortion_events"],
    ]);
    const apiVersion = readText(stats, [["api_version"], ["version"]]);
    const lastUpdated = readText(stats, [["last_updated"], ["updated_at"], ["timestamp"]]);

    return {
      recentTrades,
      recentSignals,
      mdseEvents,
      apiVersion,
      lastUpdated,
    };
  }, [stats]);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4" data-testid="stats-overview-cards">
      <p className="text-xs uppercase tracking-wider text-zinc-500">Activity Snapshot</p>

      {loading ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-20 animate-pulse rounded bg-zinc-800" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Recent Trades" value={view.recentTrades != null ? String(view.recentTrades) : "No data"} valueTestId="stats-recent-trades" />
          <StatCard label="Recent Signals" value={view.recentSignals != null ? String(view.recentSignals) : "No data"} valueTestId="stats-recent-signals" />
          <StatCard label="MDSE Events" value={view.mdseEvents != null ? String(view.mdseEvents) : "No data"} valueTestId="stats-mdse-events" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-400 sm:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <span className="text-zinc-500">API Version: </span>
          <span className="font-mono text-zinc-200" data-testid="stats-api-version">
            {view.apiVersion ?? "—"}
          </span>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <span className="text-zinc-500">Last Updated: </span>
          <span className="font-mono text-zinc-200" data-testid="stats-last-updated">
            {formatTimestamp(view.lastUpdated)}
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </section>
  );
}

function StatCard({
  label,
  value,
  valueTestId,
}: {
  label: string;
  value: string;
  valueTestId: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold font-mono text-zinc-100" data-testid={valueTestId}>
        {value}
      </p>
    </div>
  );
}
