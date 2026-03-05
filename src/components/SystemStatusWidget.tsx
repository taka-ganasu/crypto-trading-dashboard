"use client";

import { useEffect, useState } from "react";
import { fetchBotHealth } from "@/lib/api";
import type { BotHealthResponse } from "@/types";

type BotStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

const STATUS_STYLE: Record<
  BotStatus,
  { dot: string; text: string; bg: string; border: string }
> = {
  healthy: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    bg: "bg-emerald-950/30",
    border: "border-emerald-500/40",
  },
  degraded: {
    dot: "bg-yellow-400",
    text: "text-yellow-300",
    bg: "bg-yellow-950/30",
    border: "border-yellow-500/40",
  },
  unhealthy: {
    dot: "bg-red-400",
    text: "text-red-300",
    bg: "bg-red-950/30",
    border: "border-red-500/40",
  },
  unknown: {
    dot: "bg-zinc-500",
    text: "text-zinc-300",
    bg: "bg-zinc-900/30",
    border: "border-zinc-700",
  },
};

function normalizeStatus(raw: unknown): BotStatus {
  if (typeof raw !== "string") return "unknown";
  const value = raw.trim().toLowerCase();

  if (["healthy", "ok", "up", "running"].includes(value)) {
    return "healthy";
  }
  if (["degraded", "warning", "warn"].includes(value)) {
    return "degraded";
  }
  if (["unhealthy", "down", "error", "critical"].includes(value)) {
    return "unhealthy";
  }
  return "unknown";
}

function getStatus(payload: BotHealthResponse | null): BotStatus {
  if (!payload) return "unknown";
  return normalizeStatus(payload.status ?? payload.health ?? payload.state ?? null);
}

export default function SystemStatusWidget() {
  const [health, setHealth] = useState<BotHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetchBotHealth();
        if (!cancelled) {
          setHealth(response);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch health");
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

  const status = getStatus(health);
  const style = STATUS_STYLE[status];

  return (
    <section
      className={`rounded-lg border ${style.border} ${style.bg} p-4`}
      data-testid="system-status-widget"
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">Bot Status</p>

      {loading ? (
        <div className="mt-3 h-8 w-32 animate-pulse rounded-full bg-zinc-800" />
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <span
            className={`rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide ${style.text} ${style.border}`}
            data-testid="bot-status-value"
          >
            {status}
          </span>
        </div>
      )}

      {error ? (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">Auto refresh: every 30s</p>
      )}
    </section>
  );
}
