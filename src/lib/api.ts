import type {
  Trade,
  TradeSummary,
  Signal,
  PortfolioState,
  CircuitBreakerState,
  AnalysisCycle,
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
