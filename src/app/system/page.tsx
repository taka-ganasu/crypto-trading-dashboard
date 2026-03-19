"use client";

import { Suspense, useEffect, useState } from "react";
import {
  fetchApiErrors,
  fetchBotHealth,
  fetchSystemHealth,
  fetchSystemInfo,
  fetchSystemMetrics,
} from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import HealthSection from "@/components/system/HealthSection";
import MetricsSection from "@/components/system/MetricsSection";
import ConfigSection from "@/components/system/ConfigSection";
import ErrorLogSection from "@/components/system/ErrorLogSection";
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

const DASHBOARD_VERSION = packageJson.version as string;

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
  return (
    <Suspense fallback={<LoadingSpinner label="Loading system data..." />}>
      <SystemContent />
    </Suspense>
  );
}

function SystemContent() {
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
          <HealthSection
            loading={loading}
            systemError={systemError}
            status={status}
            health={health}
            goLiveChecks={goLiveChecks}
          />
          <MetricsSection loading={loading} metrics={metrics} />
          <ConfigSection
            loading={loading}
            botVersionFromHealth={botVersionFromHealth}
            vpsHead={vpsHead}
            mainHead={mainHead}
            isHeadDrift={isHeadDrift}
            info={info}
            dashboardVersion={DASHBOARD_VERSION}
          />
        </>
      ) : (
        <ErrorLogSection
          loading={loading}
          errorLogError={errorLogError}
          apiErrors={apiErrors}
          expandedTraceKey={expandedTraceKey}
          onToggleTrace={(key) =>
            setExpandedTraceKey((current) => (current === key ? null : key))
          }
        />
      )}
    </div>
  );
}
