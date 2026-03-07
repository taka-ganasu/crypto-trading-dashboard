"use client";

import { Fragment, useEffect, useState } from "react";
import {
  fetchApiErrors,
  fetchBotHealth,
  fetchSystemHealth,
  fetchSystemInfo,
  fetchSystemMetrics,
} from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import type {
  ApiError,
  BotHealthCheckItem,
  BotHealthResponse,
  SystemHealth,
  SystemInfo,
  SystemMetrics,
} from "@/types";
import packageJson from "../../../package.json";

type SysStatus = "OK" | "DEGRADED" | "DOWN" | "unreachable";
type ActiveTab = "info" | "errors";
type GoLiveStatus = "ok" | "warning" | "error" | "unknown";

type GoLiveCheckItem = {
  name: string;
  status: GoLiveStatus;
  message: string;
  latencyMs: number | null;
};

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

const DASHBOARD_VERSION = packageJson.version as string;
const GO_LIVE_STATUS_CONFIG: Record<
  GoLiveStatus,
  { label: string; color: string; dot: string; border: string; bg: string }
> = {
  ok: {
    label: "OK",
    color: "text-emerald-300",
    dot: "bg-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  warning: {
    label: "Warning",
    color: "text-yellow-300",
    dot: "bg-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
  },
  error: {
    label: "Error",
    color: "text-red-300",
    dot: "bg-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
  },
  unknown: {
    label: "Unknown",
    color: "text-zinc-300",
    dot: "bg-zinc-400",
    border: "border-zinc-700",
    bg: "bg-zinc-800/40",
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

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function normalizeStatusCode(statusCode: number | null | undefined): number {
  return typeof statusCode === "number" && Number.isFinite(statusCode)
    ? statusCode
    : 0;
}

function errorRowClass(statusCode: number): string {
  if (statusCode >= 500) {
    return "bg-red-500/10";
  }
  if (statusCode >= 400) {
    return "bg-yellow-500/10";
  }
  return "bg-zinc-900/40";
}

function formatSinceIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function normalizeSystemStatus(status: string | null | undefined): SysStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "ok") return "OK";
  if (normalized === "degraded") return "DEGRADED";
  if (normalized === "down") return "DOWN";
  return "unreachable";
}

function formatConnectivity(value: boolean | null | undefined): string {
  if (value === true) return "Connected";
  if (value === false) return "Disconnected";
  return "—";
}

function formatWebSocketStatus(value: boolean | null | undefined): {
  label: string;
  dotClass: string;
} {
  if (value === true) {
    return { label: "Connected", dotClass: "bg-emerald-400" };
  }
  if (value === false) {
    return { label: "Disconnected", dotClass: "bg-red-400" };
  }
  return { label: "Unknown", dotClass: "bg-zinc-500" };
}

function formatOpenPositions(value: number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "—";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function readStringField(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(payload[key]);
    if (value) return value;
  }
  return null;
}

function readHealthField(health: BotHealthResponse | null, keys: string[]): string | null {
  const root = asRecord(health);
  if (!root) return null;

  const direct = readStringField(root, keys);
  if (direct) return direct;

  const data = asRecord(root.data);
  if (!data) return null;
  return readStringField(data, keys);
}

function normalizeGoLiveStatus(status: string | null | undefined): GoLiveStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "ok") return "ok";
  if (normalized === "warn" || normalized === "warning") return "warning";
  if (normalized === "fail" || normalized === "error") return "error";
  return "unknown";
}

function readHealthChecks(health: BotHealthResponse | null): BotHealthCheckItem[] {
  const root = asRecord(health);
  if (!root) return [];

  if (Array.isArray(root.checks)) {
    return root.checks as BotHealthCheckItem[];
  }

  const data = asRecord(root.data);
  if (data && Array.isArray(data.checks)) {
    return data.checks as BotHealthCheckItem[];
  }
  return [];
}

function normalizeGoLiveChecks(health: BotHealthResponse | null): GoLiveCheckItem[] {
  return readHealthChecks(health).map((item, index) => {
    const rawItem = asRecord(item);
    const name = asString(rawItem?.name) ?? `check_${index + 1}`;
    const status = normalizeGoLiveStatus(asString(rawItem?.status));
    const message = asString(rawItem?.message) ?? "—";
    const latencyMs = asNumber(rawItem?.latency_ms);
    return { name, status, message, latencyMs };
  });
}

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [botHealth, setBotHealth] = useState<BotHealthResponse | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [apiErrors, setApiErrors] = useState<ApiError[]>([]);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [errorLogError, setErrorLogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("info");
  const [expandedTraceKey, setExpandedTraceKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const since = formatSinceIso(24);
      const [healthResult, metricsResult, infoResult, botHealthResult, errorsResult] =
        await Promise.allSettled([
          fetchSystemHealth(),
          fetchSystemMetrics(),
          fetchSystemInfo(),
          fetchBotHealth(),
          fetchApiErrors(since, 400, 50),
        ]);

      if (cancelled) return;

      const failedSystemCalls: string[] = [];

      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else {
        setHealth(null);
        failedSystemCalls.push("health");
      }

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value);
      } else {
        setMetrics(null);
        failedSystemCalls.push("metrics");
      }

      if (infoResult.status === "fulfilled") {
        setInfo(infoResult.value);
      } else {
        setInfo(null);
        failedSystemCalls.push("info");
      }

      if (botHealthResult.status === "fulfilled") {
        setBotHealth(botHealthResult.value);
      } else {
        setBotHealth(null);
        failedSystemCalls.push("bot_health");
      }

      if (failedSystemCalls.length > 0) {
        setSystemError(`Failed to fetch: ${failedSystemCalls.join(", ")}`);
      } else {
        setSystemError(null);
      }

      if (errorsResult.status === "fulfilled") {
        setApiErrors(errorsResult.value);
        setErrorLogError(null);
      } else {
        setApiErrors([]);
        setErrorLogError(
          errorsResult.reason instanceof Error
            ? errorsResult.reason.message
            : "Failed to fetch error logs"
        );
      }

      setLoading(false);
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const status = normalizeSystemStatus(health?.status ?? null);
  const config = STATUS_CONFIG[status];
  const wsStatus = formatWebSocketStatus(metrics?.ws_connected);
  const botVersionFromHealth = readHealthField(botHealth, [
    "bot_version",
    "version",
    "app_version",
  ]);
  const vpsHead = readHealthField(botHealth, [
    "vps_head",
    "vps_git_head",
    "vps_commit",
    "git_head",
    "commit",
  ]);
  const mainHead = readHealthField(botHealth, [
    "main_head",
    "main_git_head",
    "origin_main_head",
    "upstream_main_head",
  ]);
  const isHeadDrift = Boolean(vpsHead && mainHead && vpsHead !== mainHead);
  const goLiveChecks = normalizeGoLiveChecks(botHealth);

  if (loading && !health && !metrics && !info && !systemError) {
    return <LoadingSpinner label="Loading system data..." />;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">System</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Process health, resource usage, and API information
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
        <button
          type="button"
          data-testid="system-tab-info"
          onClick={() => setActiveTab("info")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "info"
              ? "bg-cyan-500/20 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          System Info
        </button>
        <button
          type="button"
          data-testid="system-tab-error-log"
          onClick={() => setActiveTab("errors")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "errors"
              ? "bg-cyan-500/20 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Error Log
        </button>
      </div>

      {activeTab === "info" ? (
        <>
          <div className={`rounded-xl border ${config.border} ${config.bg} p-6`}>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
              System Status
            </p>
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-32 animate-pulse rounded-full bg-zinc-800" />
              </div>
            ) : systemError ? (
              <div className="text-sm text-red-400">
                <p>Failed to load some system data</p>
                <p className="text-xs text-zinc-500 mt-1">{systemError}</p>
              </div>
            ) : (
              <>
                <StatusBadge status={status} />
                <p className={`mt-3 text-sm ${config.color}`}>{config.label}</p>
                <div className="mt-4 flex items-center gap-6 text-sm text-zinc-400">
                  <span>
                    DB:{" "}
                    <span className="text-zinc-200 font-medium">
                      {formatConnectivity(health?.db_connected)}
                    </span>
                  </span>
                  <span>
                    Exchange:{" "}
                    <span className="font-mono text-zinc-200">
                      {formatConnectivity(health?.exchange_connected)}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Resource Metrics</h2>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-800" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Memory</p>
                  <p className="mt-2 text-xl font-bold text-zinc-100">
                    {metrics?.memory_mb?.toFixed(1) ?? "—"}{" "}
                    <span className="text-sm font-normal text-zinc-500">MB</span>
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">CPU</p>
                  <p className="mt-2 text-xl font-bold text-zinc-100">
                    {metrics?.cpu_percent?.toFixed(1) ?? "—"}
                    <span className="text-sm font-normal text-zinc-500">%</span>
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">WebSocket</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${wsStatus.dotClass}`} />
                    <span className="text-xl font-bold text-zinc-100">
                      {wsStatus.label}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Last FR Fetch
                  </p>
                  <p className="mt-2 text-sm font-medium text-zinc-200">
                    {formatTimestamp(metrics?.last_fr_fetch ?? null)}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Open Positions
                  </p>
                  <p className="mt-2 text-xl font-bold text-zinc-100">
                    {formatOpenPositions(metrics?.open_positions)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4" data-testid="vps-version-heading">
              VPS Version
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-zinc-800 w-64" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">Bot Version (/api/health)</span>
                  <span className="font-mono text-sm text-zinc-200" data-testid="vps-bot-version-value">
                    {botVersionFromHealth ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">VPS HEAD</span>
                  <span className="font-mono text-sm text-zinc-200" data-testid="vps-head-value">
                    {vpsHead ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">main HEAD</span>
                  <span className="font-mono text-sm text-zinc-200" data-testid="main-head-value">
                    {mainHead ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">Sync Status</span>
                  <span
                    className={`text-sm font-semibold ${
                      isHeadDrift ? "text-yellow-300" : "text-emerald-300"
                    }`}
                    data-testid="head-sync-status"
                  >
                    {vpsHead && mainHead ? (isHeadDrift ? "DRIFT" : "IN_SYNC") : "UNKNOWN"}
                  </span>
                </div>
                {isHeadDrift ? (
                  <p className="text-sm text-yellow-300">
                    Warning: VPS HEAD differs from main HEAD.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            data-testid="go-live-checklist"
          >
            <h2 className="text-lg font-semibold text-zinc-200 mb-1">Go-Live Checklist</h2>
            <p className="text-xs text-zinc-500 mb-4">Data source: /api/health checks</p>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />
                ))}
              </div>
            ) : goLiveChecks.length === 0 ? (
              <p className="text-sm text-zinc-400">No checks available from /api/health.</p>
            ) : (
              <div className="space-y-3">
                {goLiveChecks.map((check, index) => {
                  const statusConfig = GO_LIVE_STATUS_CONFIG[check.status];
                  return (
                    <div
                      key={`${check.name}-${index}`}
                      className={`rounded-lg border px-4 py-3 ${statusConfig.border} ${statusConfig.bg}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm text-zinc-100">{check.name}</p>
                          <p className="mt-1 text-sm text-zinc-300">{check.message}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border border-zinc-700/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusConfig.color}`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">
                        Latency:{" "}
                        {check.latencyMs != null ? `${check.latencyMs.toFixed(2)} ms` : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4" data-testid="api-info-heading">
              API Information
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-zinc-800 w-64" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">API Version</span>
                  <span className="font-mono text-sm text-zinc-200" data-testid="api-version-value">
                    {info?.api_version ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">Bot Version</span>
                  <span className="font-mono text-sm text-zinc-200" data-testid="bot-version-value">
                    {info?.bot_version ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">Dashboard Version</span>
                  <span className="font-mono text-sm text-zinc-200" data-testid="dashboard-version-value">
                    {DASHBOARD_VERSION}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-400">Database Path</span>
                  <span className="font-mono text-sm text-zinc-200 truncate ml-4 max-w-xs">
                    {info?.db_path ?? "—"}
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
        </>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-200">Error Log</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Last 24h API errors (status code &gt;= 400, max 50 records)
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-zinc-800" />
              ))}
            </div>
          ) : errorLogError ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <p>Failed to load API error logs.</p>
              <p className="mt-1 text-xs text-zinc-400">{errorLogError}</p>
            </div>
          ) : apiErrors.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">No API errors found for the selected range.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm" data-testid="error-log-table">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Path</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {apiErrors.map((entry, index) => {
                    const statusCode = normalizeStatusCode(entry.status_code);
                    const rowClass = errorRowClass(statusCode);
                    const traceKey = `${entry.ts}-${entry.path}-${index}`;
                    const traceExpanded = expandedTraceKey === traceKey;
                    const hasTraceback = Boolean(entry.traceback);

                    return (
                      <Fragment key={traceKey}>
                        <tr className={`border-b border-zinc-800/70 ${rowClass}`} data-testid="error-log-row">
                          <td className="px-3 py-2 whitespace-nowrap text-zinc-200">
                            {formatTimestamp(entry.ts)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded-md border border-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-100">
                              {statusCode || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono uppercase text-zinc-200">
                            {entry.method || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-zinc-300">{entry.path || "—"}</td>
                          <td className="px-3 py-2 text-zinc-200">
                            <p>{entry.detail || "—"}</p>
                            {hasTraceback ? (
                              <button
                                type="button"
                                className="mt-1 text-xs text-cyan-300 hover:text-cyan-200"
                                onClick={() =>
                                  setExpandedTraceKey((current) =>
                                    current === traceKey ? null : traceKey
                                  )
                                }
                              >
                                {traceExpanded ? "Hide traceback" : "Show traceback"}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                        {traceExpanded && hasTraceback ? (
                          <tr className="border-b border-zinc-800/70 bg-zinc-950/60">
                            <td className="px-3 py-3" colSpan={5}>
                              <p className="mb-2 text-xs text-zinc-400">
                                {entry.exc_type ? `Exception: ${entry.exc_type}` : "Traceback"}
                              </p>
                              <pre
                                className="max-h-64 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300"
                                data-testid="error-traceback"
                              >
                                {entry.traceback}
                              </pre>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
