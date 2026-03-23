/**
 * Extended Performance page tests — slippageColor, rsiColor,
 * summary null fallbacks, cumulative PnL %, warning section names,
 * empty data tables, PnL coloring.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/performance",
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => <div data-testid="dynamic-chart" />;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

vi.mock("@/lib/api", () => ({
  fetchPerformanceSummary: vi.fn(),
  fetchExecutionQuality: vi.fn(),
  fetchMarketSnapshots: vi.fn(),
  fetchEquityCurve: vi.fn(),
  fetchTradesByStrategy: vi.fn(),
}));

vi.mock("@/lib/chartUtils", () => ({
  fillEquityCurveGaps: vi.fn((data: unknown[]) => data),
  fillStrategyPnlGaps: vi.fn((data: unknown[]) => data),
}));

import PerformancePage from "../performance/page";
import {
  fetchPerformanceSummary,
  fetchExecutionQuality,
  fetchMarketSnapshots,
  fetchEquityCurve,
  fetchTradesByStrategy,
} from "@/lib/api";

function setupAllSuccess(summaryOverrides: Record<string, unknown> = {}) {
  vi.mocked(fetchPerformanceSummary).mockResolvedValue({
    total_pnl: 250.5,
    win_rate: 0.65,
    profit_factor: 1.82,
    avg_slippage: 0.045,
    initial_balance: 1000,
    total_trades: 10,
    ...summaryOverrides,
  });
  vi.mocked(fetchExecutionQuality).mockResolvedValue([
    {
      id: 1,
      trade_id: 1,
      expected_price: 50000,
      actual_price: 50010,
      slippage_pct: 0.02,
      api_latency_ms: 120,
      timestamp: "2026-03-15T10:00:00",
    },
  ]);
  vi.mocked(fetchMarketSnapshots).mockResolvedValue([
    {
      id: 1,
      symbol: "BTC/USDT",
      price: 83000,
      rsi: 55.3,
      adx: 25.1,
      macd: 0.0012,
      volume: 1500000,
      timestamp: "2026-03-15T10:00:00",
    },
  ]);
  vi.mocked(fetchEquityCurve).mockResolvedValue({
    data: [
      { date: "2026-03-15", balance: 1250.5, daily_pnl: 50, cumulative_pnl: 250.5 },
    ],
    total_days: 1,
    start_date: "2026-03-15",
    end_date: "2026-03-15",
    initial_balance: 1000,
  });
  vi.mocked(fetchTradesByStrategy).mockResolvedValue([
    { date: "2026-03-15", strategy: "momentum", trade_count: 3, daily_pnl: 50 },
  ]);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* slippageColor function — tested via table cell CSS classes          */
/* ------------------------------------------------------------------ */

describe("Performance — slippageColor", () => {
  it("slippage > 0.5 has text-red-400", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 100,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.8,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([
      {
        id: 1,
        trade_id: 1,
        expected_price: 100,
        actual_price: 101,
        slippage_pct: 0.6,
        api_latency_ms: 200,
        timestamp: "2026-03-15T10:00:00",
      },
    ]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([]);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("0.600%")).toBeDefined();
    });

    // Table cell slippage
    expect(screen.getByText("0.600%").className).toContain("text-red-400");

    // Avg slippage card also red
    const avgSlippageCard = screen.getByText("Avg Slippage").closest("div") as HTMLElement;
    const slippageValue = within(avgSlippageCard).getByText("0.800%");
    expect(slippageValue.className).toContain("text-red-400");
  });

  it("slippage between 0.1 and 0.5 has text-yellow-400", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 100,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.2,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([
      {
        id: 1,
        trade_id: 1,
        expected_price: 100,
        actual_price: 100.3,
        slippage_pct: 0.3,
        api_latency_ms: 150,
        timestamp: "2026-03-15T10:00:00",
      },
    ]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([]);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("0.300%")).toBeDefined();
    });

    expect(screen.getByText("0.300%").className).toContain("text-yellow-400");
  });

  it("slippage < 0.1 has text-emerald-400", async () => {
    setupAllSuccess();
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("0.020%")).toBeDefined();
    });

    // 0.02 < 0.1 → emerald
    expect(screen.getByText("0.020%").className).toContain("text-emerald-400");
  });
});

/* ------------------------------------------------------------------ */
/* rsiColor function — tested via market snapshot table                */
/* ------------------------------------------------------------------ */

describe("Performance — rsiColor", () => {
  it("RSI > 70 has text-red-400", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 0,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.01,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([
      {
        id: 1,
        symbol: "BTC/USDT",
        price: 80000,
        rsi: 75.2,
        adx: 20,
        macd: 0.001,
        volume: 1000000,
        timestamp: "2026-03-15T10:00:00",
      },
    ]);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("75.2")).toBeDefined();
    });

    expect(screen.getByText("75.2").className).toContain("text-red-400");
  });

  it("RSI < 30 has text-emerald-400", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 0,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.01,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([
      {
        id: 1,
        symbol: "ETH/USDT",
        price: 3000,
        rsi: 22.5,
        adx: 18,
        macd: -0.002,
        volume: 500000,
        timestamp: "2026-03-15T10:00:00",
      },
    ]);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("22.5")).toBeDefined();
    });

    expect(screen.getByText("22.5").className).toContain("text-emerald-400");
  });

  it("RSI between 30-70 has text-zinc-300", async () => {
    setupAllSuccess();
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("55.3")).toBeDefined();
    });

    expect(screen.getByText("55.3").className).toContain("text-zinc-300");
  });
});

/* ------------------------------------------------------------------ */
/* Summary card null fallbacks                                         */
/* ------------------------------------------------------------------ */

describe("Performance — summary null fallbacks", () => {
  it("shows '—' when win_rate is null", async () => {
    setupAllSuccess({ win_rate: null });
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Win Rate")).toBeDefined();
    });

    const winRateCard = screen.getByText("Win Rate").closest("div") as HTMLElement;
    expect(within(winRateCard).getByText("—")).toBeDefined();
  });

  it("shows '—' when profit_factor is null", async () => {
    setupAllSuccess({ profit_factor: null });
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Profit Factor")).toBeDefined();
    });

    const pfCard = screen.getByText("Profit Factor").closest("div") as HTMLElement;
    expect(within(pfCard).getByText("—")).toBeDefined();
  });

  it("shows '—' when avg_slippage is null", async () => {
    setupAllSuccess({ avg_slippage: null });
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Avg Slippage")).toBeDefined();
    });

    const slipCard = screen.getByText("Avg Slippage").closest("div") as HTMLElement;
    expect(within(slipCard).getByText("—")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Total PnL coloring                                                  */
/* ------------------------------------------------------------------ */

describe("Performance — total PnL coloring", () => {
  it("positive total PnL has text-emerald-400", async () => {
    setupAllSuccess({ total_pnl: 500 });
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Total PnL")).toBeDefined();
    });

    const card = screen.getByText("Total PnL").closest("div") as HTMLElement;
    const pnlValue = within(card).getByText(/\+500\.00/);
    expect(pnlValue.className).toContain("text-emerald-400");
  });

  it("negative total PnL has text-red-400", async () => {
    setupAllSuccess({ total_pnl: -150 });
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Total PnL")).toBeDefined();
    });

    const card = screen.getByText("Total PnL").closest("div") as HTMLElement;
    const pnlValue = within(card).getByText(/-150\.00/);
    expect(pnlValue.className).toContain("text-red-400");
  });
});

/* ------------------------------------------------------------------ */
/* Cumulative PnL % display                                            */
/* ------------------------------------------------------------------ */

describe("Performance — cumulative PnL %", () => {
  it("shows cumulative PnL percentage next to total PnL", async () => {
    // latestBalance = 1250.5, initialBalance = 1000
    // cumulativePnlPct = (1250.5 - 1000) / 1000 * 100 = 25.05%
    setupAllSuccess();
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Total PnL")).toBeDefined();
    });

    // Should display (25.05%)
    const card = screen.getByText("Total PnL").closest("div") as HTMLElement;
    expect(within(card).getByText("(25.05%)")).toBeDefined();
  });

  it("hides cumulative PnL % when initialBalance is null", async () => {
    setupAllSuccess({ initial_balance: null });
    // Also override the equity curve to not have initial_balance
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [{ date: "2026-03-15", balance: 1250.5, daily_pnl: 50, cumulative_pnl: 250.5 }],
      total_days: 1,
      start_date: "2026-03-15",
      end_date: "2026-03-15",
      initial_balance: null,
    });

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Total PnL")).toBeDefined();
    });

    // No percentage bracket should appear
    const card = screen.getByText("Total PnL").closest("div") as HTMLElement;
    expect(within(card).queryByText(/\(\d+\.\d+%\)/)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Warning message lists specific failed sections                      */
/* ------------------------------------------------------------------ */

describe("Performance — warning section specifics", () => {
  it("lists 'equity curve' in warning when curve API fails", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 100,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.01,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([]);
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("timeout"));
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText(/equity curve/)).toBeDefined();
    });
  });

  it("lists 'market snapshots' in warning when snapshots API fails", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 100,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.01,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([]);
    vi.mocked(fetchMarketSnapshots).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText(/market snapshots/)).toBeDefined();
    });
  });

  it("no summary cards rendered when summary API fails (partial)", async () => {
    vi.mocked(fetchPerformanceSummary).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchExecutionQuality).mockResolvedValue([]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([]);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Performance")).toBeDefined();
    });

    // Summary cards should not appear
    expect(screen.queryByText("Win Rate")).toBeNull();
    expect(screen.queryByText("Profit Factor")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Execution quality — null trade_id                                   */
/* ------------------------------------------------------------------ */

describe("Performance — execution null trade_id", () => {
  it("shows '—' for null trade_id in execution table", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue({
      total_pnl: 0,
      win_rate: 0.5,
      profit_factor: 1.0,
      avg_slippage: 0.01,
      initial_balance: 1000,
      total_trades: 10,
    });
    vi.mocked(fetchExecutionQuality).mockResolvedValue([
      {
        id: 1,
        trade_id: null,
        expected_price: 100,
        actual_price: 100.5,
        slippage_pct: 0.5,
        api_latency_ms: 200,
        timestamp: "2026-03-15T10:00:00",
      },
    ]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([]);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [],
      total_days: 0,
      start_date: "",
      end_date: "",
      initial_balance: 1000,
    });
    vi.mocked(fetchTradesByStrategy).mockResolvedValue([]);

    render(<PerformancePage />);

    const table = await screen.findByLabelText("Execution quality table");
    const row = within(table).getAllByRole("row")[1];
    // First cell (trade_id) should show "—"
    expect(within(row).getByText("—")).toBeDefined();
  });
});
