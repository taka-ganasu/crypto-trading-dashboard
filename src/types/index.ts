export type ExecutionMode = "all" | "live" | "paper" | "dry_run";

export interface Trade {
  id: number;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  pnl_pct: number | null;
  fees: number | null;
  entry_time: string;
  exit_time: string | null;
  exit_reason: string | null;
  strategy: string | null;
  cycle_id: number | null;
  created_at: string | null;
  execution_mode: string | null;
}

export interface TradeSummary {
  total_trades: number;
  winning_trades: number | null;
  losing_trades: number | null;
  win_rate: number | null;
  total_pnl: number | null;
  profit_factor: number | null;
  message: string | null;
}

export interface Signal {
  id: number;
  timestamp: string;
  symbol: string;
  action: string;
  score: number | null;
  confidence: number | null;
  executed: number;
  skip_reason: string | null;
  strategy_type: string | null;
  cycle_id: number | null;
  created_at: string | null;
}

export interface TradeListResponse {
  trades: Trade[];
  total: number;
  offset: number;
  limit: number;
}

export interface SignalListResponse {
  signals: Signal[];
  total: number;
  offset: number;
  limit: number;
}

export interface PortfolioPosition {
  side?: string | null;
  size?: number | null;
  entry_price?: number | null;
  mark_price?: number | null;
  unrealized_pnl?: number | null;
  [key: string]: unknown;
}

export interface PortfolioData {
  positions?: Record<string, PortfolioPosition>;
  equity?: number | null;
  available_balance?: number | null;
  total_balance?: number | null;
  open_trade_count?: number | null;
  timestamp?: string | null;
  daily_pnl?: number | null;
  daily_pnl_pct?: number | null;
  [key: string]: unknown;
}

export interface PortfolioState {
  data: PortfolioData;
}

export interface CircuitBreakerState {
  data: Record<string, unknown>;
}

export interface SystemHealth {
  status: string;
  db_connected?: boolean | null;
  exchange_connected?: boolean | null;
  [key: string]: unknown;
}

export interface SystemMetrics {
  memory_mb?: number | null;
  cpu_percent?: number | null;
  ws_connected?: boolean | null;
  last_fr_fetch?: string | null;
  open_positions?: number | null;
  [key: string]: unknown;
}

export interface SystemInfo {
  db_path: string;
  api_version: string;
  bot_version?: string | null;
  python_version: string;
  platform: string;
}

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
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
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
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface StrategySnapshot {
  id: string;
  symbol: string;
  strategy: string;
  allocation_pct: number;
  status: string;
  trade_count?: number | null;
  win_rate?: number | null;
  recent_pnl?: number | null;
}

export interface StrategiesResponse {
  active_plan?: string | null;
  strategies: StrategySnapshot[];
}

export interface AnalysisCycle {
  id: number;
  start_time: string;
  end_time: string | null;
  symbols_processed: string | null;
  signals_generated: number;
  trades_executed: number;
  errors: string | null;
  duration_seconds: number | null;
  regime_info: string | null;
  created_at: string | null;
  total_count?: number | null;
}

export interface MdseDetectorScore {
  detector_name: string;
  win_rate: number | null;
  avg_pnl: number | null;
  weight: number | null;
  sample_count: number | null;
}

export interface MdseSummaryDetector {
  detector_name: string;
  event_count: number;
  validated_count: number;
  win_rate: number | null;
  avg_pnl: number | null;
  weight: number | null;
  sample_count: number | null;
  last_event_at: string | null;
}

export interface MdseSummary {
  total_events: number;
  validated_events: number;
  unvalidated_events: number;
  detectors: MdseSummaryDetector[];
}

export interface MdseEvent {
  id: number;
  detector_name?: string;
  detector?: string;
  symbol: string;
  direction: string;
  confidence: number;
  timestamp: string;
  ttl?: number;
  metadata_json?: string | null;
  confluence_score?: number | null;
  validated?: number;
  trade_id?: number | null;
  alert_sent?: boolean;
  alert_type?: string | null;
  created_at?: string | null;
}

export interface MdseTrade {
  id: number;
  event_id: number;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  entry_time: string;
  exit_time: string | null;
  pnl: number | null;
  position_size: number;
  created_at?: string | null;
}

export interface PerformanceSummary {
  total_pnl: number;
  win_rate: number;
  profit_factor: number;
  avg_slippage: number;
}

export interface ExecutionQuality {
  trade_id: number;
  expected_price: number;
  actual_price: number;
  slippage_pct: number;
  api_latency_ms: number;
  timestamp: string;
}

export interface MarketSnapshot {
  symbol: string;
  price: number;
  rsi: number | null;
  adx: number | null;
  macd: number | null;
  volume: number;
  timestamp: string;
}

export interface EquityCurvePoint {
  date: string;
  balance: number;
  daily_pnl: number;
  cumulative_pnl: number;
}

export interface EquityCurveResponse {
  data: EquityCurvePoint[];
  total_days: number;
  start_date: string | null;
  end_date: string | null;
}
export interface TradeByStrategyDaily {
  date: string;
  strategy: string;
  trade_count: number;
  daily_pnl: number;
}

export interface MdseTimelinePoint {
  timestamp: string;
  price: number | null;
  symbol: string | null;
}

export type MdseTimelineEvent = MdseEvent;

export interface MdseTimeline {
  prices: MdseTimelinePoint[];
  events: MdseTimelineEvent[];
}

export interface StrategyPerformance {
  strategy: string;
  trade_count: number;
  win_rate: number | null;
  profit_factor: number | null;
  sharpe: number | null;
  avg_pnl: number | null;
  max_dd: number | null;
}
