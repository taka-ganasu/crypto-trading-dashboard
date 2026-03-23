import { useEffect, useState } from "react";
import {
  fetchBotHealth,
  fetchJSON,
  fetchSystemHealth,
  fetchSystemInfo,
  fetchSystemMetrics,
} from "@/lib/api";
import type {
  ApiError,
  BotHealthResponse,
  SystemHealth,
  SystemInfo,
  SystemMetrics,
} from "@/types";
import {
  buildApiErrorsPath,
  formatSinceIso,
  normalizeApiErrorsPayload,
  normalizeGoLiveChecks,
  normalizeSystemStatus,
  readHealthField,
} from "./utils";
import type { ActiveTab, ApiErrorsPayload, GoLiveCheckItem, SysStatus } from "./utils";

export type SystemData = {
  health: SystemHealth | null;
  metrics: SystemMetrics | null;
  info: SystemInfo | null;
  botHealth: BotHealthResponse | null;
  apiErrors: ApiError[];
  systemError: string | null;
  errorLogError: string | null;
  loading: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  expandedTraceKey: string | null;
  toggleTrace: (key: string) => void;
  status: SysStatus;
  botVersionFromHealth: string | null;
  vpsHead: string | null;
  mainHead: string | null;
  isHeadDrift: boolean;
  goLiveChecks: GoLiveCheckItem[];
};

export function useSystemData(): SystemData {
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
          fetchJSON<ApiErrorsPayload, ApiError[]>(buildApiErrorsPath(since, 400, 50), {
            mapResponse: normalizeApiErrorsPayload,
          }),
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

  const toggleTrace = (key: string) =>
    setExpandedTraceKey((current) => (current === key ? null : key));

  return {
    health,
    metrics,
    info,
    botHealth,
    apiErrors,
    systemError,
    errorLogError,
    loading,
    activeTab,
    setActiveTab,
    expandedTraceKey,
    toggleTrace,
    status,
    botVersionFromHealth,
    vpsHead,
    mainHead,
    isHeadDrift,
    goLiveChecks,
  };
}
