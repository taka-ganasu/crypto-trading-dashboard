"use client";

import { useEffect, useState } from "react";
import {
  fetchSystemHealth,
  fetchSystemMetrics,
  fetchSystemInfo,
} from "@/lib/api";
import type { SystemHealth, SystemMetrics, SystemInfo } from "@/types";

type SysStatus = "OK" | "DEGRADED" | "DOWN" | "unreachable";

const STATUS_CONFIG: Record<
  SysStatus,
  { color: string; bg: string; border: string; dot: string; label: string }
> = {
  OK: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    label: "All systems operational",
  },
  DEGRADED: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-400",
    label: "Some services degraded",
  },
  DOWN: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-400",
    label: "System is down",
  },
  unreachable: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    dot: "bg-zinc-400",
    label: "Health monitor not running (API-only mode)",
  },
};

function StatusBadge({ status }: { status: SysStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold ${config.color} ${config.bg} border ${config.border}`}
    >
      <span className={`h-3 w-3 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [h, m, i] = await Promise.all([
          fetchSystemHealth(),
          fetchSystemMetrics(),
          fetchSystemInfo(),
        ]);
        if (!cancelled) {
          setHealth(h);
          setMetrics(m);
          setInfo(i);
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

  const rawStatus = health?.status ?? "OK";
  const status: SysStatus = rawStatus in STATUS_CONFIG ? (rawStatus as SysStatus) : "unreachable";
  const config = STATUS_CONFIG[status];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">System</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Process health, resource usage, and API information
        </p>
      </div>

      {/* System Status */}
      <div className={`rounded-xl border ${config.border} ${config.bg} p-6`}>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
          System Status
        </p>
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 animate-pulse rounded-full bg-zinc-800" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-400">
            <p>Failed to load system status</p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
          </div>
        ) : (
          <>
            <StatusBadge status={status} />
            <p className={`mt-3 text-sm ${config.color}`}>{config.label}</p>
            <div className="mt-4 flex items-center gap-6 text-sm text-zinc-400">
              <span>
                Uptime:{" "}
                <span className="text-zinc-200 font-medium">
                  {formatUptime(health?.uptime_seconds ?? 0)}
                </span>
              </span>
              <span>
                PID:{" "}
                <span className="font-mono text-zinc-200">
                  {health?.pid ?? "—"}
                </span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Resource Metrics */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          Resource Metrics
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-zinc-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Memory */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Memory
              </p>
              <p className="mt-2 text-xl font-bold text-zinc-100">
                {metrics?.memory_mb?.toFixed(1) ?? "—"}{" "}
                <span className="text-sm font-normal text-zinc-500">MB</span>
              </p>
            </div>

            {/* CPU */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                CPU
              </p>
              <p className="mt-2 text-xl font-bold text-zinc-100">
                {metrics?.cpu_percent?.toFixed(1) ?? "—"}
                <span className="text-sm font-normal text-zinc-500">%</span>
              </p>
            </div>

            {/* WebSocket */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                WebSocket
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${metrics?.ws_connected ? "bg-emerald-400" : "bg-red-400"}`}
                />
                <span className="text-xl font-bold text-zinc-100">
                  {metrics?.ws_connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {/* Last FR Fetch */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Last FR Fetch
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-200">
                {formatTimestamp(metrics?.last_fr_fetch ?? null)}
              </p>
            </div>

            {/* Open Positions */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Open Positions
              </p>
              <p className="mt-2 text-xl font-bold text-zinc-100">
                {metrics?.open_positions ?? 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          API Information
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-6 animate-pulse rounded bg-zinc-800 w-64"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Database Path</span>
              <span className="font-mono text-sm text-zinc-200 truncate ml-4 max-w-xs">
                {info?.db_path ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">API Version</span>
              <span className="font-mono text-sm text-zinc-200">
                {info?.api_version ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Python Version</span>
              <span className="font-mono text-sm text-zinc-200">
                {info?.python_version ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
