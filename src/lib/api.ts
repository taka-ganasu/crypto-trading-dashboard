import type {
  ExecutionMode,
  Trade,
  TradeListResponse,
  TradeSummary,
  SignalListResponse,
  PortfolioState,
  CircuitBreakerState,
  AnalysisCycle,
  MdseDetectorScore,
  MdseEvent,
  MdseTrade,
  MdseSummary,
  SystemHealth,
  SystemMetrics,
  SystemInfo,
  ApiError,
  BotHealthResponse,
  SystemStatsResponse,
  StrategiesResponse,
  PerformanceSummary,
  ExecutionQuality,
  MarketSnapshot,
  EquityCurveResponse,
  StrategyPerformance,
  TradeByStrategyDaily,
  MdseTimeline,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function appendExecutionModeParam(
  params: URLSearchParams,
  executionMode?: ExecutionMode
): void {
  if (executionMode && executionMode !== "all") {
    params.set("execution_mode", executionMode);
  }
}

async function fetchJSON<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out (5s)");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchTrades(
  symbol?: string,
  limit: number = 50,
  start?: string,
  end?: string,
  executionMode?: ExecutionMode,
  offset: number = 0
): Promise<TradeListResponse> {
  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  params.set("limit", String(limit));
  if (offset > 0) params.set("offset", String(offset));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  appendExecutionModeParam(params, executionMode);
  const query = params.toString();
  return fetchJSON<TradeListResponse>(`/trades?${query}`);
}

export async function fetchTradeSummary(): Promise<TradeSummary> {
  return fetchJSON<TradeSummary>("/trades/summary");
}

export async function fetchSignals(
  symbol?: string,
  limit: number = 1000,
  start?: string,
  end?: string,
  executionMode?: ExecutionMode,
  offset?: number
): Promise<SignalListResponse> {
  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  appendExecutionModeParam(params, executionMode);
  const query = params.toString();
  return fetchJSON<SignalListResponse>(`/signals?${query}`);
}

export async function fetchPortfolioState(): Promise<PortfolioState> {
  return fetchJSON<PortfolioState>("/portfolio/state");
}

export async function fetchCircuitBreakerState(): Promise<CircuitBreakerState> {
  return fetchJSON<CircuitBreakerState>("/cb/state");
}

export async function fetchAnalysisCycles(
  limit: number = 50,
  start?: string,
  end?: string,
  executionMode?: ExecutionMode
): Promise<AnalysisCycle[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  appendExecutionModeParam(params, executionMode);
  return fetchJSON<AnalysisCycle[]>(`/cycles?${params.toString()}`);
}

export async function fetchMdseScores(): Promise<MdseDetectorScore[]> {
  return fetchJSON<MdseDetectorScore[]>("/mdse/scores");
}

export async function fetchMdseSummary(): Promise<MdseSummary> {
  return fetchJSON<MdseSummary>("/mdse/summary");
}

export async function fetchMdseEvents(
  hours: number = 24,
  start?: string,
  end?: string
): Promise<MdseEvent[]> {
  const params = new URLSearchParams();
  if (start) {
    params.set("start", start);
    if (end) params.set("end", end);
  } else {
    params.set("hours", String(hours));
  }
  return fetchJSON<MdseEvent[]>(`/mdse/events?${params.toString()}`);
}

export async function fetchMdseTrades(
  limit: number = 20,
  start?: string,
  end?: string
): Promise<MdseTrade[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return fetchJSON<MdseTrade[]>(`/mdse/trades?${params.toString()}`);
}

export async function fetchMdseTimeline(
  hours: number = 24,
  start?: string,
  end?: string
): Promise<MdseTimeline> {
  const params = new URLSearchParams();
  if (start) {
    params.set("start", start);
    if (end) params.set("end", end);
  } else {
    params.set("hours", String(hours));
  }
  return fetchJSON<MdseTimeline>(`/mdse/timeline?${params.toString()}`);
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  return fetchJSON<SystemHealth>("/system/health");
}

export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  return fetchJSON<SystemMetrics>("/system/metrics");
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return fetchJSON<SystemInfo>("/system/info");
}

export async function fetchApiErrors(
  since?: string,
  statusGte?: number,
  limit?: number
): Promise<ApiError[]> {
  const params = new URLSearchParams();
  if (since) params.set("since", since);
  if (statusGte) params.set("status_gte", String(statusGte));
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BASE_URL}/errors${query ? `?${query}` : ""}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const payload: unknown = await res.json();
    return Array.isArray(payload) ? (payload as ApiError[]) : [];
  } catch (err) {
    throw err instanceof Error ? err : new Error("Failed to fetch error logs");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchBotHealth(): Promise<BotHealthResponse> {
  return fetchJSON<BotHealthResponse>("/health");
}

export async function fetchSystemStatsOverview(): Promise<SystemStatsResponse> {
  return fetchJSON<SystemStatsResponse>("/system/stats");
}

export async function fetchPerformanceSummary(
  executionMode?: ExecutionMode
): Promise<PerformanceSummary> {
  const params = new URLSearchParams();
  appendExecutionModeParam(params, executionMode);
  const query = params.toString();
  return fetchJSON<PerformanceSummary>(
    `/performance/summary${query ? `?${query}` : ""}`
  );
}

export async function fetchExecutionQuality(
  limit: number = 50,
  executionMode?: ExecutionMode
): Promise<ExecutionQuality[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  appendExecutionModeParam(params, executionMode);
  return fetchJSON<ExecutionQuality[]>(
    `/performance/execution-quality?${params.toString()}`
  );
}

export async function fetchMarketSnapshots(
  limit: number = 20,
  executionMode?: ExecutionMode
): Promise<MarketSnapshot[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  appendExecutionModeParam(params, executionMode);
  return fetchJSON<MarketSnapshot[]>(
    `/performance/market-snapshots?${params.toString()}`
  );
}

export async function fetchStrategyPerformance(): Promise<StrategyPerformance[]> {
  return fetchJSON<StrategyPerformance[]>("/performance/by-strategy");
}

export async function fetchStrategies(): Promise<StrategiesResponse> {
  return fetchJSON<StrategiesResponse>("/strategies");
}

export async function fetchTradesByStrategy(
  startDate?: string,
  endDate?: string,
  executionMode?: ExecutionMode
): Promise<TradeByStrategyDaily[]> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  appendExecutionModeParam(params, executionMode);
  const query = params.toString();
  return fetchJSON<TradeByStrategyDaily[]>(
    `/trades/by-strategy${query ? `?${query}` : ""}`
  );
}

export async function fetchEquityCurve(
  startDate?: string,
  endDate?: string,
  executionMode?: ExecutionMode
): Promise<EquityCurveResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  appendExecutionModeParam(params, executionMode);
  const query = params.toString();

  try {
    return await fetchJSON<EquityCurveResponse>(
      `/equity-curve${query ? `?${query}` : ""}`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("API error: 404")) {
      return fetchJSON<EquityCurveResponse>(
        `/performance/equity-curve${query ? `?${query}` : ""}`
      );
    }
    throw error;
  }
}
