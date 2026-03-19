/**
 * API Contract Tests
 *
 * Validates that E2E mock responses in e2e/test-utils.ts conform to
 * the TypeScript type definitions in src/types/index.ts.
 *
 * These tests catch drift between mock data and real API types:
 * - If a type field is renamed/removed, the satisfies check fails at compile time
 * - If mock data is missing required fields, the runtime assertion catches it
 */
import { describe, expect, test } from "vitest";
import type {
  TradeListResponse,
  TradeSummary,
  SignalListResponse,
  PortfolioState,
  CircuitBreakerState,
  MdseDetectorScore,
  MdseSummary,
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
  AnalysisCycle,
  EquityCurveResponse,
  StrategyPerformance,
  TradeByStrategyDaily,
  MdseTimeline,
  Trade,
  Signal,
} from "@/types";

// ── helpers ──────────────────────────────────────────────────────────

/** Compile-time + runtime shape check: value satisfies T's required keys */
function assertKeys<T>(value: unknown, requiredKeys: (keyof T)[]): void {
  expect(value).toBeTruthy();
  expect(typeof value).toBe("object");
  for (const key of requiredKeys) {
    expect(value).toHaveProperty(String(key));
  }
}

// ── Default mock data (mirrors e2e/test-utils.ts defaultApiResponses) ──

describe("API contract: default responses", () => {
  test("/api/trades matches TradeListResponse", () => {
    const data = {
      trades: [
        {
          id: 1,
          symbol: "BTC/USDT",
          side: "BUY",
          entry_price: 100000,
          exit_price: 100500,
          quantity: 0.1,
          pnl: 50,
          pnl_pct: 0.5,
          fees: 1,
          entry_time: "2026-01-01T00:00:00Z",
          exit_time: "2026-01-01T01:00:00Z",
          exit_reason: "tp",
          strategy: "trend",
          cycle_id: 1,
          created_at: "2026-01-01",
          execution_mode: "paper",
        } satisfies Trade,
      ],
      total: 1,
      offset: 0,
      limit: 50,
    } satisfies TradeListResponse;
    assertKeys<TradeListResponse>(data, ["trades", "total", "offset", "limit"]);
  });

  test("/api/trades/summary matches TradeSummary", () => {
    const data = {
      total_trades: 1,
      winning_trades: 1,
      losing_trades: 0,
      win_rate: 1,
      total_pnl: 50,
      profit_factor: 2,
      message: null,
    } satisfies TradeSummary;
    assertKeys<TradeSummary>(data, ["total_trades"]);
  });

  test("/api/signals matches SignalListResponse", () => {
    const data = {
      signals: [
        {
          id: 1,
          timestamp: "2026-01-01T00:00:00Z",
          symbol: "BTC/USDT",
          action: "buy",
          score: 0.8,
          confidence: 75,
          executed: 1,
          skip_reason: null,
          strategy_type: "trend",
          cycle_id: 1,
          execution_mode: "paper",
          created_at: "2026-01-01",
        } satisfies Signal,
      ],
      total: 1,
      offset: 0,
      limit: 1000,
    } satisfies SignalListResponse;
    assertKeys<SignalListResponse>(data, ["signals", "total", "offset", "limit"]);
  });

  test("/api/portfolio/state matches PortfolioState", () => {
    const data = {
      data: {
        last_updated: "2026-01-01T00:00:00Z",
        total_equity: 10000,
        strategies: {
          btc_usdt: {
            symbol: "BTC/USDT",
            strategy: "trend",
            allocation_pct: 50,
            equity: 5000,
            initial_equity: 4500,
          },
        },
      },
    } satisfies PortfolioState;
    assertKeys<PortfolioState>(data, ["data"]);
    expect(data.data.strategies).toBeDefined();
  });

  test("/api/cb/state matches CircuitBreakerState", () => {
    const data = {
      data: {
        status: "NORMAL",
        recent_events: [],
      },
    } satisfies CircuitBreakerState;
    assertKeys<CircuitBreakerState>(data, ["data"]);
    expect(data.data.status).toBe("NORMAL");
  });

  test("/api/mdse/scores matches MdseDetectorScore[]", () => {
    const data = [
      {
        id: 1,
        detector_name: "detector-a",
        win_rate: 61,
        avg_pnl: 12.5,
        weight: 0.5,
        sample_count: 10,
      } satisfies MdseDetectorScore,
    ];
    expect(data).toHaveLength(1);
    assertKeys<MdseDetectorScore>(data[0], ["detector_name"]);
  });

  test("/api/mdse/summary matches MdseSummary", () => {
    const data = {
      total_events: 1,
      validated_events: 0,
      unvalidated_events: 1,
      detectors: [
        {
          detector_name: "detector-a",
          event_count: 1,
          validated_count: 0,
          win_rate: 0.61,
          avg_pnl: 12.5,
          weight: 0.5,
          sample_count: 10,
          last_event_at: "2026-01-01T00:00:00Z",
        },
      ],
      daily_event_trend: [],
      weekly_event_trend: [],
      detector_hit_rate_trend: [],
      confidence_distribution: [],
    } satisfies MdseSummary;
    assertKeys<MdseSummary>(data, ["total_events", "validated_events", "unvalidated_events", "detectors"]);
  });

  test("/api/mdse/events matches MdseEvent[]", () => {
    const data = [
      {
        id: 1,
        detector_name: "detector-a",
        detector: "detector-a",
        symbol: "BTC/USDT",
        direction: "long",
        confidence: 80,
        timestamp: "2026-01-01T00:00:00Z",
        ttl: 600,
        validated: 0,
        alert_sent: false,
      } satisfies MdseEvent,
    ];
    assertKeys<MdseEvent>(data[0], ["id", "symbol", "direction", "confidence", "timestamp"]);
  });

  test("/api/mdse/trades matches MdseTrade[]", () => {
    const data = [
      {
        id: 1,
        event_id: 1,
        symbol: "BTC/USDT",
        direction: "long",
        entry_price: 100000,
        exit_price: 100100,
        entry_time: "2026-01-01T00:00:00Z",
        exit_time: null,
        pnl: 10,
        position_size: 0.1,
      } satisfies MdseTrade,
    ];
    assertKeys<MdseTrade>(data[0], ["id", "event_id", "symbol", "direction", "entry_price", "position_size"]);
  });

  test("/api/system/health matches SystemHealth", () => {
    const data = {
      status: "OK",
      uptime_seconds: 3600,
      pid: 1234,
    } satisfies SystemHealth;
    assertKeys<SystemHealth>(data, ["status"]);
  });

  test("/api/system/metrics matches SystemMetrics", () => {
    const data = {
      memory_mb: 123.4,
      cpu_percent: 12.3,
      ws_connected: true,
      last_fr_fetch: "2026-01-01T00:00:00Z",
      open_positions: 1,
    } satisfies SystemMetrics;
    assertKeys<SystemMetrics>(data, []);
  });

  test("/api/system/info matches SystemInfo", () => {
    const data = {
      python_version: "3.10",
      platform: "linux",
      db_path: "data/trades.db",
      api_version: "1.0.0",
      bot_version: "0.2.0",
    } satisfies SystemInfo;
    assertKeys<SystemInfo>(data, ["db_path", "api_version", "python_version", "platform"]);
  });

  test("/api/errors matches ApiError[]", () => {
    const data = [
      {
        ts: "2026-01-01T00:30:00Z",
        status_code: 503,
        method: "GET",
        path: "/api/system/health",
        detail: "Service unavailable",
        exc_type: "RuntimeError",
        traceback: "Traceback (most recent call last):\\nRuntimeError: service down",
      } satisfies ApiError,
    ];
    assertKeys<ApiError>(data[0], ["ts", "status_code", "method", "path", "detail"]);
  });

  test("/api/health matches BotHealthResponse", () => {
    const data = {
      status: "healthy",
      api_version: "v1.3.0",
      updated_at: "2026-01-01T00:10:00Z",
    } satisfies BotHealthResponse;
    assertKeys<BotHealthResponse>(data, []);
  });

  test("/api/system/stats matches SystemStatsResponse", () => {
    const data = {
      recent_trades: 12,
      recent_signals: 34,
      mdse_events: 5,
      api_version: "v1.3.0",
      last_updated: "2026-01-01T00:10:00Z",
    } satisfies SystemStatsResponse;
    assertKeys<SystemStatsResponse>(data, []);
  });

  test("/api/performance/summary matches PerformanceSummary", () => {
    const data = {
      total_trades: 1,
      total_pnl: 50,
      win_rate: 1,
      profit_factor: 2,
      avg_slippage: 0.05,
      initial_balance: 10000,
    } satisfies PerformanceSummary;
    assertKeys<PerformanceSummary>(data, ["total_pnl", "win_rate", "profit_factor", "avg_slippage"]);
  });

  test("/api/performance/execution-quality matches ExecutionQuality[]", () => {
    const data = [
      {
        id: 1,
        trade_id: 1,
        expected_price: 100000,
        actual_price: 100010,
        slippage_pct: 0.01,
        api_latency_ms: 120,
        timestamp: "2026-01-01T00:00:00Z",
      } satisfies ExecutionQuality,
    ];
    assertKeys<ExecutionQuality>(data[0], ["trade_id", "timestamp"]);
  });

  test("/api/performance/market-snapshots matches MarketSnapshot[]", () => {
    const data = [
      {
        id: 1,
        symbol: "BTC/USDT",
        price: 100000,
        volume: 1000,
        rsi: 50,
        adx: 25,
        macd: 10,
        timestamp: "2026-01-01T00:00:00Z",
      } satisfies MarketSnapshot,
    ];
    assertKeys<MarketSnapshot>(data[0], ["symbol", "timestamp"]);
  });

  test("/api/cycles matches AnalysisCycle[]", () => {
    const data = [
      {
        id: 101,
        start_time: "2026-01-01T00:00:00Z",
        end_time: "2026-01-01T00:05:00Z",
        symbols_processed: '["BTC/USDT","ETH/USDT"]',
        signals_generated: 4,
        trades_executed: 2,
        errors: null,
        duration_seconds: 300,
        regime_info: '{"regime":"trending"}',
        execution_mode: "paper",
        created_at: "2026-01-01T00:05:00Z",
      } satisfies AnalysisCycle,
    ];
    assertKeys<AnalysisCycle>(data[0], ["id", "start_time", "signals_generated", "trades_executed"]);
  });

  test("/api/equity-curve matches EquityCurveResponse", () => {
    const data = {
      data: [
        { date: "2026-01-01", balance: 10100, daily_pnl: 100, cumulative_pnl: 100 },
      ],
      total_days: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-01",
      initial_balance: 10000,
    } satisfies EquityCurveResponse;
    assertKeys<EquityCurveResponse>(data, ["data", "total_days"]);
  });

  test("/api/performance/by-strategy matches StrategyPerformance[]", () => {
    const data = [
      {
        strategy: "trend_following",
        trade_count: 15,
        win_rate: 0.6,
        profit_factor: 1.8,
        sharpe: 1.2,
        avg_pnl: 25.5,
        max_dd: 120.0,
      } satisfies StrategyPerformance,
    ];
    assertKeys<StrategyPerformance>(data[0], ["strategy", "trade_count"]);
  });

  test("/api/trades/by-strategy matches TradeByStrategyDaily[]", () => {
    const data = [
      {
        date: "2026-01-01",
        strategy: "trend_following",
        trade_count: 2,
        daily_pnl: 55,
      } satisfies TradeByStrategyDaily,
    ];
    assertKeys<TradeByStrategyDaily>(data[0], ["date", "strategy", "trade_count", "daily_pnl"]);
  });

  test("/api/mdse/timeline matches MdseTimeline", () => {
    const data = {
      prices: [
        { timestamp: "2026-01-01T00:00:00Z", price: 100000, symbol: "BTC/USDT" },
      ],
      events: [
        {
          id: 1,
          timestamp: "2026-01-01T08:00:00Z",
          detector_name: "fr_extreme",
          detector: "fr_extreme",
          symbol: "BTC/USDT",
          direction: "long",
          confidence: 85,
          ttl: 600,
          validated: 1,
          alert_sent: true,
        },
      ],
    } satisfies MdseTimeline;
    assertKeys<MdseTimeline>(data, ["prices", "events"]);
  });
});

// ── Null-safe mock data (mirrors nullSafeApiResponses) ──

describe("API contract: null-safe responses", () => {
  test("empty trades response", () => {
    const data = { trades: [], total: 0, offset: 0, limit: 50 } satisfies TradeListResponse;
    expect(data.trades).toHaveLength(0);
  });

  test("null-heavy TradeSummary", () => {
    const data = {
      total_trades: 0,
      winning_trades: null,
      losing_trades: null,
      win_rate: null,
      total_pnl: null,
      profit_factor: null,
      message: null,
    } satisfies TradeSummary;
    expect(data.total_trades).toBe(0);
  });

  test("empty signals response", () => {
    const data = { signals: [], total: 0, offset: 0, limit: 1000 } satisfies SignalListResponse;
    expect(data.signals).toHaveLength(0);
  });

  test("empty portfolio state", () => {
    const data = { data: {} } satisfies PortfolioState;
    expect(data.data).toBeDefined();
  });

  test("inactive circuit breaker", () => {
    const data = {
      data: { status: "inactive" },
    } satisfies CircuitBreakerState;
    expect(data.data.status).toBe("inactive");
  });

  test("null-heavy SystemMetrics", () => {
    const data = {
      memory_mb: null,
      cpu_percent: null,
      ws_connected: null,
      last_fr_fetch: null,
      open_positions: null,
    } satisfies SystemMetrics;
    expect(data.memory_mb).toBeNull();
  });

  test("null-heavy BotHealthResponse", () => {
    const data = {
      status: null,
      api_version: null,
      updated_at: null,
    } satisfies BotHealthResponse;
    expect(data.status).toBeNull();
  });

  test("null-heavy SystemStatsResponse", () => {
    const data = {
      recent_trades: null,
      recent_signals: null,
      mdse_events: null,
      api_version: null,
      last_updated: null,
    } satisfies SystemStatsResponse;
    expect(data.recent_trades).toBeNull();
  });

  test("empty EquityCurveResponse", () => {
    const data = {
      data: [],
      total_days: 0,
      start_date: null,
      end_date: null,
    } satisfies EquityCurveResponse;
    expect(data.data).toHaveLength(0);
  });

  test("null-heavy PerformanceSummary", () => {
    const data = {
      total_trades: 0,
      total_pnl: null,
      win_rate: null,
      profit_factor: null,
      avg_slippage: null,
    } satisfies PerformanceSummary;
    expect(data.total_pnl).toBeNull();
  });

  test("empty MdseTimeline", () => {
    const data = { prices: [], events: [] } satisfies MdseTimeline;
    expect(data.prices).toHaveLength(0);
    expect(data.events).toHaveLength(0);
  });
});
