"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchSystemStatsOverview } from "@/lib/api";
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

function readNumber(payload: SystemStatsResponse | null, keys: string[]): number {
  if (!payload) return 0;

  const root = payload as Record<string, unknown>;
  const nested = asRecord(payload.data);

  for (const key of keys) {
    const rootValue = asNumber(root[key]);
    if (rootValue != null) {
      return rootValue;
    }
  }

  if (nested) {
    for (const key of keys) {
      const nestedValue = asNumber(nested[key]);
      if (nestedValue != null) {
        return nestedValue;
      }
    }
  }

  return 0;
}

function readText(payload: SystemStatsResponse | null, keys: string[]): string | null {
  if (!payload) return null;

  const root = payload as Record<string, unknown>;
  const nested = asRecord(payload.data);

  for (const key of keys) {
    const rootValue = asString(root[key]);
    if (rootValue) {
      return rootValue;
    }
  }

  if (nested) {
    for (const key of keys) {
      const nestedValue = asString(nested[key]);
      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return null;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

export default function StatsOverviewCards() {
  const [stats, setStats] = useState<SystemStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetchSystemStatsOverview();
        if (!cancelled) {
          setStats(response);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch stats");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const view = useMemo(() => {
    const recentTrades = readNumber(stats, ["recent_trades", "trades_24h", "trade_count"]);
    const recentSignals = readNumber(stats, ["recent_signals", "signals_24h", "signal_count"]);
    const mdseEvents = readNumber(stats, ["mdse_events", "mdse_event_count", "events_24h"]);
    const apiVersion = readText(stats, ["api_version", "version"]);
    const lastUpdated = readText(stats, ["last_updated", "updated_at", "timestamp"]);

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
          <StatCard label="Recent Trades" value={String(view.recentTrades)} valueTestId="stats-recent-trades" />
          <StatCard label="Recent Signals" value={String(view.recentSignals)} valueTestId="stats-recent-signals" />
          <StatCard label="MDSE Events" value={String(view.mdseEvents)} valueTestId="stats-mdse-events" />
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
