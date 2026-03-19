import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

let mockPathname = "/";
let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const DynamicChartStub = () => <div data-testid="dynamic-chart-stub" />;
    DynamicChartStub.displayName = "DynamicChartStub";
    return DynamicChartStub;
  },
}));

vi.mock("@/lib/api", () => ({
  fetchTrades: vi.fn(),
  fetchSignals: vi.fn(),
  fetchPortfolioState: vi.fn(),
  fetchStrategyPerformance: vi.fn(),
  fetchEquityCurve: vi.fn(),
  fetchPerformanceSummary: vi.fn(),
  fetchExecutionQuality: vi.fn(),
  fetchMarketSnapshots: vi.fn(),
  fetchTradesByStrategy: vi.fn(),
  fetchAnalysisCycles: vi.fn(),
}));

vi.mock("@/lib/chartUtils", () => ({
  fillEquityCurveGaps: vi.fn((data: unknown[]) => data),
  fillStrategyPnlGaps: vi.fn((data: unknown[]) => data),
}));

import AppShell from "../AppShell";
import TradesPage from "@/app/trades/page";
import SignalsPage from "@/app/signals/page";
import PortfolioPage from "@/app/portfolio/page";
import PerformancePage from "@/app/performance/page";
import AnalysisPage from "@/app/analysis/page";
import {
  fetchTrades,
  fetchSignals,
  fetchPortfolioState,
  fetchStrategyPerformance,
  fetchEquityCurve,
  fetchPerformanceSummary,
  fetchExecutionQuality,
  fetchMarketSnapshots,
  fetchTradesByStrategy,
  fetchAnalysisCycles,
} from "@/lib/api";

function setRoute(pathname: string, search: string = ""): void {
  mockPathname = pathname;
  mockSearchParams = new URLSearchParams(search);
}

function seedApiMocks(): void {
  vi.mocked(fetchTrades).mockResolvedValue({
    trades: [
      {
        id: 1,
        symbol: "BTC/USDT",
        side: "BUY",
        entry_price: 83000,
        exit_price: 84000,
        quantity: 0.01,
        pnl: 10,
        pnl_pct: 1.2,
        fees: 0.5,
        entry_time: "2026-03-15T10:00:00Z",
        exit_time: "2026-03-15T12:00:00Z",
        exit_reason: "take_profit",
        strategy: "momentum",
        cycle_id: 10,
        created_at: "2026-03-15T10:00:00Z",
        execution_mode: "live",
      },
    ],
    total: 1,
    offset: 0,
    limit: 50,
  });

  vi.mocked(fetchSignals).mockResolvedValue({
    signals: [
      {
        id: 1,
        timestamp: "2026-03-15T10:00:00Z",
        symbol: "BTC/USDT",
        action: "buy",
        score: 0.82,
        confidence: 75,
        executed: 1,
        skip_reason: null,
        strategy_type: "momentum",
        cycle_id: 1,
        created_at: "2026-03-15T10:00:00Z",
      },
    ],
    total: 1,
    offset: 0,
    limit: 25,
  });

  vi.mocked(fetchPortfolioState).mockResolvedValue({
    data: {
      total_equity: 10000,
      last_updated: "2026-03-15T10:00:00Z",
      strategies: {
        btc_momentum: {
          symbol: "BTC/USDT",
          strategy: "momentum",
          allocation_pct: 60,
          equity: 6000,
          initial_equity: 5500,
        },
        eth_reversal: {
          symbol: "ETH/USDT",
          strategy: "reversal",
          allocation_pct: 40,
          equity: 4000,
          initial_equity: 3800,
        },
      },
    },
  });

  vi.mocked(fetchStrategyPerformance).mockResolvedValue([
    {
      strategy: "momentum",
      trade_count: 5,
      win_rate: 0.6,
      profit_factor: 1.4,
      sharpe: 1.1,
      avg_pnl: 12,
      max_dd: 40,
    },
  ]);

  vi.mocked(fetchEquityCurve).mockResolvedValue({
    data: [
      { date: "2026-03-14", balance: 9900, daily_pnl: -100, cumulative_pnl: -100 },
      { date: "2026-03-15", balance: 10050, daily_pnl: 150, cumulative_pnl: 50 },
    ],
    total_days: 2,
    start_date: "2026-03-14",
    end_date: "2026-03-15",
    initial_balance: 10000,
  });

  vi.mocked(fetchPerformanceSummary).mockResolvedValue({
    total_pnl: 50,
    win_rate: 0.5,
    profit_factor: 1.25,
    avg_slippage: 0.05,
    initial_balance: 10000,
  });

  vi.mocked(fetchExecutionQuality).mockResolvedValue([
    {
      trade_id: 1,
      expected_price: 83000,
      actual_price: 83020,
      slippage_pct: 0.024,
      api_latency_ms: 120,
      timestamp: "2026-03-15T10:00:00Z",
    },
  ]);

  vi.mocked(fetchMarketSnapshots).mockResolvedValue([
    {
      symbol: "BTC/USDT",
      price: 83000,
      rsi: 55,
      adx: 26,
      macd: 1.2,
      volume: 1200000,
      timestamp: "2026-03-15T10:00:00Z",
    },
  ]);

  vi.mocked(fetchTradesByStrategy).mockResolvedValue([
    {
      date: "2026-03-15",
      strategy: "momentum",
      trade_count: 1,
      daily_pnl: 50,
    },
  ]);

  vi.mocked(fetchAnalysisCycles).mockResolvedValue([
    {
      id: 101,
      start_time: "2026-03-15T10:00:00Z",
      end_time: "2026-03-15T10:05:00Z",
      symbols_processed: "[\"BTC/USDT\"]",
      signals_generated: 4,
      trades_executed: 2,
      errors: null,
      duration_seconds: 300,
      regime_info: "{\"regime\":\"trending\",\"avg_confidence\":72.5}",
      created_at: "2026-03-15T10:05:00Z",
      total_count: 1,
    },
  ]);
}

beforeEach(() => {
  setRoute("/");
  mockPush.mockReset();
  seedApiMocks();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("accessibility coverage", () => {
  it("labels the main navigation and keeps mobile navigation controls focusable", () => {
    setRoute("/trades");

    render(
      <AppShell>
        <button type="button">Focusable child</button>
      </AppShell>
    );

    const navigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    const menuButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    const activeLink = within(navigation).getByRole("link", {
      name: "Trades",
    });

    menuButton.focus();
    expect(document.activeElement).toBe(menuButton);

    activeLink.focus();
    expect(document.activeElement).toBe(activeLink);
    expect(activeLink.getAttribute("aria-current")).toBe("page");

    fireEvent.click(menuButton);

    const closeButton = screen.getByRole("button", {
      name: "Close navigation menu",
    });
    closeButton.focus();
    expect(document.activeElement).toBe(closeButton);
  });

  it("renders labeled tables and filter groups for trades and signals", async () => {
    setRoute("/trades");
    const tradesView = render(<TradesPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Trade History" })
      ).toBeDefined();
    });

    const timeRangeFilter = screen.getByRole("group", {
      name: "Time range filter",
    });
    const executionModeFilter = screen.getByRole("group", {
      name: "Execution mode filter",
    });
    const tradesTable = screen.getByRole("table", { name: "Trades table" });
    const firstRangeButton = within(timeRangeFilter).getByRole("button", {
      name: "24h",
    });
    const firstModeButton = within(executionModeFilter).getByRole("button", {
      name: "Live",
    });

    firstRangeButton.focus();
    expect(document.activeElement).toBe(firstRangeButton);
    firstModeButton.focus();
    expect(document.activeElement).toBe(firstModeButton);
    expect(tradesTable).toBeDefined();

    tradesView.unmount();

    setRoute("/signals");
    render(<SignalsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Signals" })
      ).toBeDefined();
    });

    const signalsTable = screen.getByRole("table", { name: "Signals table" });
    const executionStatusSelect = screen.getByRole("combobox", {
      name: "Filter by execution status",
    });

    executionStatusSelect.focus();
    expect(document.activeElement).toBe(executionStatusSelect);
    expect(signalsTable).toBeDefined();
  });

  it("keeps portfolio data table and strategy details dialog accessible", async () => {
    setRoute("/portfolio");
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Portfolio" })
      ).toBeDefined();
    });

    const portfolioTable = screen.getByRole("table", {
      name: "Strategy allocations table",
    });
    expect(portfolioTable).toBeDefined();

    fireEvent.click(screen.getByText("BTC/USDT"));

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Strategy Details" })
      ).toBeDefined();
    });

    const closeButton = screen.getByRole("button", { name: "Close panel" });
    closeButton.focus();
    expect(document.activeElement).toBe(closeButton);
  });

  it("renders accessible data regions on performance and analysis pages", async () => {
    setRoute("/performance");
    const performanceView = render(<PerformancePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Performance" })
      ).toBeDefined();
    });

    expect(
      screen.getByRole("table", { name: "Execution quality table" })
    ).toBeDefined();
    expect(
      screen.getByRole("table", { name: "Market snapshots table" })
    ).toBeDefined();

    performanceView.unmount();

    setRoute("/analysis");
    render(<AnalysisPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Analysis" })
      ).toBeDefined();
    });

    expect(
      screen.getByRole("group", { name: "Time range filter" })
    ).toBeDefined();
    expect(
      screen.getByRole("img", { name: "Regime transition timeline chart" })
    ).toBeDefined();
    expect(screen.getByRole("table", { name: "Cycle table" })).toBeDefined();
  });
});
