"use client";

import { Fragment, useEffect, useState } from "react";
import {
  fetchApiErrors,
  fetchSystemHealth,
  fetchSystemInfo,
  fetchSystemMetrics,
} from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { ApiError, SystemHealth, SystemInfo, SystemMetrics } from "@/types";

type SysStatus = "OK" | "DEGRADED" | "DOWN" | "unreachable";
type ActiveTab = "info" | "errors";

type GoLiveChecklistItem = {
  id: number;
  label: string;
  completed: boolean;
  note?: string;
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

const GO_LIVE_CHECKLIST: GoLiveChecklistItem[] = [
  { id: 1, label: "HL本番接続", completed: true },
  { id: 2, label: "入金確認($656)", completed: true },
  { id: 3, label: "注文テスト", completed: true },
  { id: 4, label: "緊急停止テスト", completed: true },
  { id: 5, label: "--once実行", completed: true },
  { id: 6, label: "WS安定テスト", completed: true },
  { id: 7, label: "SQLiteバックアップ", completed: true },
  { id: 8, label: "連絡先リスト", completed: true },
  { id: 9, label: "FR source HL切替", completed: true },
  { id: 10, label: "testnet:false切替", completed: true },
  { id: 11, label: "systemd設定", completed: true },
  { id: 12, label: "Slack通知設定", completed: true },
];

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

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
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
      const [healthResult, metricsResult, infoResult, errorsResult] =
        await Promise.allSettled([
          fetchSystemHealth(),
          fetchSystemMetrics(),
          fetchSystemInfo(),
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
  const completedCount = GO_LIVE_CHECKLIST.filter((item) => item.completed).length;
  const totalCount = GO_LIVE_CHECKLIST.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

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

          <div
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6"
            data-testid="go-live-widget"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Go-Live Progress</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Deployment readiness checklist for production cutover
                </p>
              </div>
              <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-right">
                <p className="text-xs uppercase tracking-wider text-cyan-300">Progress</p>
                <p className="text-xl font-bold text-cyan-200">
                  {progressPercent}% ({completedCount}/{totalCount})
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Remaining blockers: testnet:false切替（殿判断）、systemd設定、Slack Webhook
            </p>

            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {GO_LIVE_CHECKLIST.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg border p-3 ${
                    item.completed
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-zinc-700 bg-zinc-900/60"
                  }`}
                  data-testid="go-live-item"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base leading-none" aria-hidden="true">
                      {item.completed ? "✅" : "⬜"}
                    </span>
                    <div>
                      <p className="text-sm text-zinc-100">
                        {item.id}. {item.label}
                      </p>
                      {item.note ? <p className="mt-1 text-xs text-zinc-400">{item.note}</p> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
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
                    <span
                      className={`h-3 w-3 rounded-full ${
                        metrics?.ws_connected ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    <span className="text-xl font-bold text-zinc-100">
                      {metrics?.ws_connected ? "Connected" : "Disconnected"}
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
                  <p className="mt-2 text-xl font-bold text-zinc-100">{metrics?.open_positions ?? 0}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">API Information</h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-zinc-800 w-64" />
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
                  <span className="font-mono text-sm text-zinc-200">{info?.api_version ?? "—"}</span>
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
