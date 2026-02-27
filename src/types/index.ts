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

export interface PortfolioState {
  data: Record<string, unknown>;
}

export interface CircuitBreakerState {
  data: Record<string, unknown>;
}

export interface SystemHealth {
  status: "OK" | "DEGRADED" | "DOWN";
  uptime_seconds: number;
  pid: number;
}

export interface SystemMetrics {
  memory_mb: number;
  cpu_percent: number;
  ws_connected: boolean;
  last_fr_fetch: string | null;
  open_positions: number;
}

export interface SystemInfo {
  db_path: string;
  api_version: string;
  python_version: string;
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
}

export interface MdseDetectorScore {
  detector_name: string;
  win_rate: number;
  avg_pnl: number;
  weight: number;
  sample_count: number;
}

export interface MdseEvent {
  id: number;
  detector: string;
  symbol: string;
  direction: "long" | "short";
  confidence: number;
  timestamp: string;
}

export interface MdseTrade {
  event_id: number;
  symbol: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  position_size: number;
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
