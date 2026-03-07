import type {
  Trade,
  TradeSummary,
  Signal,
  PortfolioState,
  CircuitBreakerState,
  AnalysisCycle,
  MdseDetectorScore,
  MdseEvent,
  MdseTrade,
  SystemHealth,
  SystemMetrics,
  SystemInfo,
  ApiError,
  BotHealthResponse,
  SystemStatsResponse,
  PerformanceSummary,
  ExecutionQuality,
  MarketSnapshot,
  EquityCurveResponse,
  StrategyPerformance,
  MdseTimeline,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTrades(
  symbol?: string,
  limit: number = 50,
  start?: string,
  end?: string
): Promise<Trade[]> {
  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  params.set("limit", String(limit));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const query = params.toString();
  return fetchJSON<Trade[]>(`/trades?${query}`);
}

export async function fetchTradeSummary(): Promise<TradeSummary> {
  return fetchJSON<TradeSummary>("/trades/summary");
}

export async function fetchSignals(
  symbol?: string,
  limit: number = 50,
  start?: string,
  end?: string
): Promise<Signal[]> {
  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  params.set("limit", String(limit));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const query = params.toString();
  return fetchJSON<Signal[]>(`/signals?${query}`);
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
  end?: string
): Promise<AnalysisCycle[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return fetchJSON<AnalysisCycle[]>(`/cycles?${params.toString()}`);
}

export async function fetchMdseScores(): Promise<MdseDetectorScore[]> {
  return fetchJSON<MdseDetectorScore[]>("/mdse/scores");
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
  const res = await fetch(`${BASE_URL}/errors${query ? `?${query}` : ""}`);
  if (!res.ok) return [];
  const payload: unknown = await res.json();
  return Array.isArray(payload) ? (payload as ApiError[]) : [];
}

export async function fetchBotHealth(): Promise<BotHealthResponse> {
  return fetchJSON<BotHealthResponse>("/health");
}

export async function fetchSystemStatsOverview(): Promise<SystemStatsResponse> {
  return fetchJSON<SystemStatsResponse>("/system/stats");
}

export async function fetchPerformanceSummary(): Promise<PerformanceSummary> {
  return fetchJSON<PerformanceSummary>("/performance/summary");
}

export async function fetchExecutionQuality(
  limit: number = 50
): Promise<ExecutionQuality[]> {
  return fetchJSON<ExecutionQuality[]>(
    `/performance/execution-quality?limit=${limit}`
  );
}

export async function fetchMarketSnapshots(
  limit: number = 20
): Promise<MarketSnapshot[]> {
  return fetchJSON<MarketSnapshot[]>(
    `/performance/market-snapshots?limit=${limit}`
  );
}

export async function fetchStrategyPerformance(): Promise<StrategyPerformance[]> {
  return fetchJSON<StrategyPerformance[]>("/performance/by-strategy");
}

export async function fetchEquityCurve(
  startDate?: string,
  endDate?: string
): Promise<EquityCurveResponse> {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const query = params.toString();
  return fetchJSON<EquityCurveResponse>(
    `/performance/equity-curve${query ? `?${query}` : ""}`
  );
}
