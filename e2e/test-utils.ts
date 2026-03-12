import { expect, type Page } from "@playwright/test";

type JsonValue = unknown;

type ApiResponseMap = Record<string, JsonValue>;

export const defaultApiResponses: ApiResponseMap = {
  "/api/trades": {
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
      },
    ],
    total: 1,
    offset: 0,
    limit: 50,
  },
  "/api/trades/summary": {
    total_trades: 1,
    winning_trades: 1,
    losing_trades: 0,
    win_rate: 1,
    total_pnl: 50,
    profit_factor: 2,
  },
  "/api/signals": {
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
        created_at: "2026-01-01",
      },
    ],
    total: 1,
    offset: 0,
    limit: 1000,
  },
  "/api/portfolio/state": {
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
  },
  "/api/cb/state": {
    data: {
      status: "NORMAL",
      recent_events: [],
    },
  },
  "/api/mdse/scores": [
    {
      detector_name: "detector-a",
      win_rate: 61,
      avg_pnl: 12.5,
      weight: 0.5,
      sample_count: 10,
    },
  ],
  "/api/mdse/summary": {
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
  },
  "/api/mdse/events": [
    {
      id: 1,
      detector: "detector-a",
      symbol: "BTC/USDT",
      direction: "long",
      confidence: 80,
      timestamp: "2026-01-01T00:00:00Z",
    },
  ],
  "/api/mdse/trades": [
    {
      event_id: 1,
      symbol: "BTC/USDT",
      direction: "long",
      entry_price: 100000,
      exit_price: 100100,
      pnl: 10,
      position_size: 0.1,
    },
  ],
  "/api/system/health": {
    status: "OK",
    uptime_seconds: 3600,
    pid: 1234,
  },
  "/api/system/metrics": {
    memory_mb: 123.4,
    cpu_percent: 12.3,
    ws_connected: true,
    last_fr_fetch: "2026-01-01T00:00:00Z",
    open_positions: 1,
  },
  "/api/system/info": {
    python_version: "3.10",
    platform: "linux",
    db_path: "data/trades.db",
    api_version: "1.0.0",
    bot_version: "0.2.0",
  },
  "/api/errors": {
    errors: [
      {
        ts: "2026-01-01T00:30:00Z",
        status_code: 503,
        method: "GET",
        path: "/api/system/health",
        detail: "Service unavailable",
        exc_type: "RuntimeError",
        traceback: "Traceback (most recent call last):\\nRuntimeError: service down",
      },
      {
        ts: "2026-01-01T01:00:00Z",
        status_code: 404,
        method: "GET",
        path: "/api/unknown",
        detail: "Not found",
        exc_type: null,
        traceback: null,
      },
    ],
    count: 2,
  },
  "/api/health": {
    status: "healthy",
    api_version: "v1.3.0",
    updated_at: "2026-01-01T00:10:00Z",
  },
  "/api/system/stats": {
    recent_trades: 12,
    recent_signals: 34,
    mdse_events: 5,
    api_version: "v1.3.0",
    last_updated: "2026-01-01T00:10:00Z",
  },
  "/api/performance/summary": {
    total_trades: 1,
    winning_trades: 1,
    losing_trades: 0,
    win_rate: 1,
    total_pnl: 50,
    profit_factor: 2,
    avg_slippage: 0.05,
    initial_balance: 10000,
  },
  "/api/performance/execution-quality": [
    {
      trade_id: 1,
      expected_price: 100000,
      actual_price: 100010,
      slippage_pct: 0.01,
      api_latency_ms: 120,
      timestamp: "2026-01-01T00:00:00Z",
    },
  ],
  "/api/performance/market-snapshots": [
    {
      id: 1,
      timestamp: "2026-01-01T00:00:00Z",
      symbol: "BTC/USDT",
      price: 100000,
      volume: 1000,
      rsi: 50,
      adx: 25,
      bb_upper: 101000,
      bb_lower: 99000,
      bb_middle: 100000,
      ma_short: 100100,
      ma_long: 99800,
      macd: 10,
      macd_signal: 8,
      cycle_id: 1,
      created_at: "2026-01-01",
    },
  ],
  "/api/cycles": [
    {
      id: 101,
      start_time: "2026-01-01T00:00:00Z",
      end_time: "2026-01-01T00:05:00Z",
      symbols_processed: "[\"BTC/USDT\",\"ETH/USDT\"]",
      signals_generated: 4,
      trades_executed: 2,
      errors: null,
      duration_seconds: 300,
      regime_info: "{\"regime\":\"trending\",\"avg_confidence\":72.5}",
      created_at: "2026-01-01T00:05:00Z",
    },
    {
      id: 102,
      start_time: "2026-01-01T00:05:00Z",
      end_time: "2026-01-01T00:10:00Z",
      symbols_processed: "[\"BTC/USDT\"]",
      signals_generated: 3,
      trades_executed: 1,
      errors: null,
      duration_seconds: 300,
      regime_info: "{\"current_regime\":\"ranging\",\"average_confidence\":61.2}",
      created_at: "2026-01-01T00:10:00Z",
    },
    {
      id: 103,
      start_time: "2026-01-01T00:10:00Z",
      end_time: "2026-01-01T00:15:00Z",
      symbols_processed: "[\"XRP/USDT\"]",
      signals_generated: 2,
      trades_executed: 1,
      errors: null,
      duration_seconds: 300,
      regime_info: "{\"regime\":\"high_vol\",\"confidence\":55}",
      created_at: "2026-01-01T00:15:00Z",
    },
    {
      id: 104,
      start_time: "2026-01-01T00:15:00Z",
      end_time: null,
      symbols_processed: null,
      signals_generated: 1,
      trades_executed: 0,
      errors: null,
      duration_seconds: null,
      regime_info: "macro_driven",
      created_at: "2026-01-01T00:15:10Z",
    },
  ],
  "/api/equity-curve": {
    data: [
      { date: "2026-01-01", balance: 10100, daily_pnl: 100, cumulative_pnl: 100 },
      { date: "2026-01-02", balance: 10120, daily_pnl: 20, cumulative_pnl: 120 },
      { date: "2026-01-03", balance: 10320, daily_pnl: 200, cumulative_pnl: 320 },
    ],
    total_days: 3,
    start_date: "2026-01-01",
    end_date: "2026-01-03",
    initial_balance: 10000,
  },
  "/api/performance/equity-curve": {
    data: [
      { date: "2026-01-01", balance: 10100, daily_pnl: 100, cumulative_pnl: 100 },
      { date: "2026-01-02", balance: 10120, daily_pnl: 20, cumulative_pnl: 120 },
      { date: "2026-01-03", balance: 10320, daily_pnl: 200, cumulative_pnl: 320 },
    ],
    total_days: 3,
    start_date: "2026-01-01",
    end_date: "2026-01-03",
    initial_balance: 10000,
  },
  "/api/performance/by-strategy": [
    {
      strategy: "trend_following",
      trade_count: 15,
      win_rate: 0.6,
      profit_factor: 1.8,
      sharpe: 1.2,
      avg_pnl: 25.5,
      max_dd: 120.0,
    },
    {
      strategy: "mean_reversion",
      trade_count: 10,
      win_rate: 0.5,
      profit_factor: 1.1,
      sharpe: 0.6,
      avg_pnl: 5.2,
      max_dd: 80.0,
    },
  ],
  "/api/trades/by-strategy": [
    {
      date: "2026-01-01",
      strategy: "trend_following",
      trade_count: 2,
      daily_pnl: 55,
    },
    {
      date: "2026-01-01",
      strategy: "mean_reversion",
      trade_count: 1,
      daily_pnl: -5,
    },
  ],
  "/api/mdse/timeline": {
    prices: [
      { timestamp: "2026-01-01T00:00:00Z", price: 100000, symbol: "BTC/USDT" },
      { timestamp: "2026-01-01T04:00:00Z", price: 100200, symbol: "BTC/USDT" },
      { timestamp: "2026-01-01T08:00:00Z", price: 99800, symbol: "BTC/USDT" },
      { timestamp: "2026-01-01T12:00:00Z", price: 100500, symbol: "BTC/USDT" },
      { timestamp: "2026-01-01T16:00:00Z", price: 100300, symbol: "BTC/USDT" },
      { timestamp: "2026-01-01T20:00:00Z", price: 100800, symbol: "BTC/USDT" },
    ],
    events: [
      {
        id: 1,
        timestamp: "2026-01-01T08:00:00Z",
        price: 99800,
        detector: "fr_extreme",
        symbol: "BTC/USDT",
        direction: "long",
        confidence: 85,
      },
      {
        id: 2,
        timestamp: "2026-01-01T16:00:00Z",
        price: 100300,
        detector: "liq_cascade",
        symbol: "BTC/USDT",
        direction: "short",
        confidence: 72,
      },
    ],
  },
};

export const nullSafeApiResponses: ApiResponseMap = {
  "/api/trades": { trades: [], total: 0, offset: 0, limit: 50 },
  "/api/trades/summary": {
    total_trades: 0,
    winning_trades: null,
    losing_trades: null,
    win_rate: null,
    total_pnl: null,
    profit_factor: null,
  },
  "/api/signals": { signals: [], total: 0, offset: 0, limit: 1000 },
  "/api/portfolio/state": { data: {} },
  "/api/cb/state": { data: { status: "inactive" } },
  "/api/mdse/scores": [],
  "/api/mdse/summary": {
    total_events: 0,
    validated_events: 0,
    unvalidated_events: 0,
    detectors: [],
  },
  "/api/mdse/events": [],
  "/api/mdse/trades": [],
  "/api/system/health": { status: "unreachable" },
  "/api/system/metrics": {
    memory_mb: null,
    cpu_percent: null,
    ws_connected: null,
    last_fr_fetch: null,
    open_positions: null,
  },
  "/api/system/info": {
    python_version: "3.10",
    platform: "linux",
    db_path: "data/trades.db",
    api_version: "1.0.0",
    bot_version: null,
  },
  "/api/errors": { errors: [], count: 0 },
  "/api/health": {
    status: null,
    api_version: null,
    updated_at: null,
  },
  "/api/system/stats": {
    recent_trades: null,
    recent_signals: null,
    mdse_events: null,
    api_version: null,
    last_updated: null,
  },
  "/api/performance/summary": {
    total_trades: 0,
    winning_trades: null,
    losing_trades: null,
    win_rate: null,
    total_pnl: null,
    profit_factor: null,
    avg_slippage: null,
  },
  "/api/performance/execution-quality": [],
  "/api/performance/market-snapshots": [
    {
      id: 1,
      timestamp: "2026-01-01T00:00:00Z",
      symbol: "BTC/USDT",
      price: null,
      volume: null,
      rsi: null,
      adx: null,
      bb_upper: null,
      bb_lower: null,
      bb_middle: null,
      ma_short: null,
      ma_long: null,
      macd: null,
      macd_signal: null,
      cycle_id: 1,
      created_at: "2026-01-01",
    },
  ],
  "/api/cycles": [],
  "/api/equity-curve": {
    data: [],
    total_days: 0,
    start_date: null,
    end_date: null,
  },
  "/api/performance/equity-curve": {
    data: [],
    total_days: 0,
    start_date: null,
    end_date: null,
  },
  "/api/performance/by-strategy": [],
  "/api/trades/by-strategy": [],
  "/api/mdse/timeline": { prices: [], events: [] },
};

export async function installApiMocks(
  page: Page,
  responses: ApiResponseMap
): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const payload = pathname in responses ? responses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
}

export function expectNoConsoleErrors(errors: string[]): void {
  expect(errors, `Console/page errors:\n${errors.join("\n")}`).toEqual([]);
}
