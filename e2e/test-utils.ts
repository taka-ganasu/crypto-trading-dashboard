import { expect, type Page } from "@playwright/test";

type JsonValue = unknown;

type ApiResponseMap = Record<string, JsonValue>;

export const defaultApiResponses: ApiResponseMap = {
  "/api/trades": [
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
    },
  ],
  "/api/trades/summary": {
    total_trades: 1,
    winning_trades: 1,
    losing_trades: 0,
    win_rate: 1,
    total_pnl: 50,
    profit_factor: 2,
  },
  "/api/signals": [
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
  },
  "/api/performance/summary": {
    total_trades: 1,
    winning_trades: 1,
    losing_trades: 0,
    win_rate: 1,
    total_pnl: 50,
    profit_factor: 2,
    avg_slippage: 0.05,
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
  "/api/cycles": [],
};

export const nullSafeApiResponses: ApiResponseMap = {
  "/api/trades": [],
  "/api/trades/summary": {
    total_trades: 0,
    winning_trades: null,
    losing_trades: null,
    win_rate: null,
    total_pnl: null,
    profit_factor: null,
  },
  "/api/signals": [],
  "/api/portfolio/state": { data: {} },
  "/api/cb/state": { data: { status: "inactive" } },
  "/api/mdse/scores": [],
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
