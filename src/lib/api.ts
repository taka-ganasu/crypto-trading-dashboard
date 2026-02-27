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
  PerformanceSummary,
  ExecutionQuality,
  MarketSnapshot,
} from "@/types";

const BASE_URL = "/api";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTrades(
  symbol?: string,
  limit: number = 50
): Promise<Trade[]> {
  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  params.set("limit", String(limit));
  const query = params.toString();
  return fetchJSON<Trade[]>(`/trades?${query}`);
}

export async function fetchTradeSummary(): Promise<TradeSummary> {
  return fetchJSON<TradeSummary>("/trades/summary");
}

export async function fetchSignals(
  symbol?: string,
  limit: number = 50
): Promise<Signal[]> {
  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  params.set("limit", String(limit));
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
  limit: number = 50
): Promise<AnalysisCycle[]> {
  return fetchJSON<AnalysisCycle[]>(`/cycles?limit=${limit}`);
}

export async function fetchMdseScores(): Promise<MdseDetectorScore[]> {
  return fetchJSON<MdseDetectorScore[]>("/mdse/scores");
}

export async function fetchMdseEvents(
  hours: number = 24
): Promise<MdseEvent[]> {
  return fetchJSON<MdseEvent[]>(`/mdse/events?hours=${hours}`);
}

export async function fetchMdseTrades(
  limit: number = 20
): Promise<MdseTrade[]> {
  return fetchJSON<MdseTrade[]>(`/mdse/trades?limit=${limit}`);
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
