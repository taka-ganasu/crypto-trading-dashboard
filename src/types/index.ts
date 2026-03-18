/**
 * Dashboard type definitions.
 *
 * Types are sourced from the Bot OpenAPI spec via openapi-typescript (api-generated.ts).
 * Dashboard-only types and types requiring extension are defined manually below.
 *
 * To regenerate: npm run generate:types
 */
import type { components } from "./api-generated";

type Schemas = components["schemas"];

// ────────────────────────────────────────────────────────────────
// Re-exported from Bot OpenAPI spec (source of truth)
// ────────────────────────────────────────────────────────────────
export type Trade = Schemas["TradeResponse"];
export type TradeSummary = Schemas["TradeSummaryResponse"];
export type Signal = Schemas["SignalResponse"];
export type TradeListResponse = Schemas["TradeListResponse"];
export type SignalListResponse = Schemas["SignalListResponse"];
export type PortfolioPosition = Schemas["PortfolioPosition"];
export type StrategiesResponse = Schemas["StrategiesResponse"];
export type StrategySnapshot = Schemas["StrategySnapshot"];
export type AnalysisCycle = Schemas["CycleResponse"];
export type MdseSummaryDetector = Schemas["MdseDetectorSummary"];
export type MdseSummary = Schemas["MdseSummaryResponse"];
export type MdseEvent = Schemas["DistortionEventResponse"];
export type MdseTrade = Schemas["DistortionTradeResponse"];
export type PerformanceSummary = Schemas["PerformanceSummaryResponse"];
export type ExecutionQuality = Schemas["ExecutionQualityResponse"];
export type MarketSnapshot = Schemas["MarketSnapshotResponse"];
export type EquityCurvePoint = Schemas["EquityCurvePoint"];
export type EquityCurveResponse = Schemas["EquityCurveResponse"];
export type TradeByStrategyDaily = Schemas["DailyStrategyPnlResponse"];
export type MdseTimelinePoint = Schemas["TimelinePricePoint"];
export type MdseTimelineEvent = Schemas["DistortionEventResponse"];
export type MdseTimeline = Schemas["TimelineResponse"];
export type StrategyPerformance = Schemas["StrategyPerformanceResponse"];
export type SystemInfo = Schemas["SystemInfoResponse"];
export type SystemMetrics = Schemas["SystemMetricsResponse"];
export type MdseDetectorScore = Schemas["DetectorScoreResponse"];

// ────────────────────────────────────────────────────────────────
// Extended types (generated base + Dashboard-specific fields)
// ────────────────────────────────────────────────────────────────
export type SystemHealth = Schemas["SystemHealthResponse"] & {
  uptime_seconds?: number | null;
  pid?: number | null;
};

export type ExecutionMode = "all" | "live" | "paper" | "dry_run";

export interface PortfolioStrategyEntry {
  symbol?: string | null;
  strategy?: string | null;
  allocation_pct?: number | null;
  equity?: number | null;
  initial_equity?: number | null;
  position_count?: number | null;
  last_signal_time?: string | null;
}

export type PortfolioData = Schemas["PortfolioData"] & {
  strategies?: Record<string, PortfolioStrategyEntry>;
};

export interface PortfolioState {
  data: PortfolioData;
}

export interface CircuitBreakerEvent {
  status?: string | null;
  message?: string | null;
  timestamp?: string | null;
}

export type CircuitBreakerData = Schemas["CircuitBreakerData"] & {
  recent_events?: CircuitBreakerEvent[] | null;
};

export interface CircuitBreakerState {
  data: CircuitBreakerData;
}

// ────────────────────────────────────────────────────────────────
// Dashboard-only types (no direct Bot API equivalent)
// ────────────────────────────────────────────────────────────────
export interface ApiError {
  ts: string;
  status_code: number;
  method: string;
  path: string;
  detail: string;
  exc_type: string | null;
  traceback: string | null;
}

export interface BotHealthCheckItem {
  name?: string | null;
  status?: string | null;
  message?: string | null;
  latency_ms?: number | null;
}

export interface BotHealthResponse {
  status?: string | null;
  health?: string | null;
  state?: string | null;
  api_version?: string | null;
  version?: string | null;
  updated_at?: string | null;
  last_updated?: string | null;
  timestamp?: string | null;
  checks?: BotHealthCheckItem[] | null;
  data?: {
    checks?: BotHealthCheckItem[] | null;
  } | null;
}

export interface SystemStatsResponse {
  total_endpoints?: number | null;
  db_stats?: {
    total_trades?: number | null;
    total_signals?: number | null;
    total_distortion_events?: number | null;
    db_size_mb?: number | null;
  } | null;
  strategy_config?: Array<{
    id: string;
    symbol: string;
    strategy: string;
    allocation_pct: number;
  }> | null;
  active_plan?: string | null;
  recent_trades?: number | null;
  trades_24h?: number | null;
  trade_count?: number | null;
  recent_signals?: number | null;
  signals_24h?: number | null;
  signal_count?: number | null;
  recent_mdse_events?: number | null;
  mdse_events?: number | null;
  mdse_event_count?: number | null;
  events_24h?: number | null;
  api_version?: string | null;
  version?: string | null;
  updated_at?: string | null;
  last_updated?: string | null;
  timestamp?: string | null;
}
