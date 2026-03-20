import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/portfolio",
}));

// Mock next/dynamic to render stub components
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = (props: { data?: unknown }) => (
      <div data-testid="dynamic-chart">{JSON.stringify(props)}</div>
    );
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchPortfolioState: vi.fn(),
  fetchEquityCurve: vi.fn(),
  fetchStrategyPerformance: vi.fn(),
}));

// Mock chartUtils
vi.mock("@/lib/chartUtils", () => ({
  fillEquityCurveGaps: vi.fn((data: unknown[]) => data),
  fillStrategyPnlGaps: vi.fn((data: unknown[]) => data),
}));

import PortfolioPage from "../portfolio/page";
import {
  fetchPortfolioState,
  fetchEquityCurve,
  fetchStrategyPerformance,
} from "@/lib/api";

const mockPortfolio = {
  data: {
    total_balance: 5000,
    last_updated: "2026-03-15T10:00:00",
    strategies: {
      btc_momentum: {
        symbol: "BTC/USDT",
        strategy: "momentum",
        allocation_pct: 40,
        equity: 2000,
        initial_equity: 1800,
        position_count: 3,
        last_signal_time: "2026-03-15T09:00:00",
      },
      sol_fr: {
        symbol: "SOL/USDT",
        strategy: "fr_reversal",
        allocation_pct: 25,
        equity: 1250,
        initial_equity: 1300,
        position_count: 1,
        last_signal_time: null,
      },
    },
  },
};

const mockEquityCurve = {
  data: [
    { date: "2026-03-14", balance: 4900, daily_pnl: -100, cumulative_pnl: -100 },
    { date: "2026-03-15", balance: 5000, daily_pnl: 100, cumulative_pnl: 0 },
  ],
  total_days: 2,
  start_date: "2026-03-14",
  end_date: "2026-03-15",
  initial_balance: 5000,
};

const mockStrategyPerf = [
  {
    strategy: "momentum",
    trade_count: 10,
    win_rate: 0.6,
    profit_factor: 1.5,
    sharpe: 1.2,
    avg_pnl: 5.0,
    max_dd: 50,
  },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Portfolio Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchPortfolioState).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchEquityCurve).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchStrategyPerformance).mockReturnValue(new Promise(() => {}));

    render(<PortfolioPage />);
    expect(screen.getByText("Loading portfolio...")).toBeDefined();
  });

  it("shows error state when portfolio API fails", async () => {
    vi.mocked(fetchPortfolioState).mockRejectedValue(
      new Error("Connection refused")
    );
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Connection refused")).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("shows portfolio data on success", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("Portfolio")).toBeDefined();
    });

    // Overview cards
    expect(screen.getByText("Total Value")).toBeDefined();
    expect(screen.getByText("Total PnL")).toBeDefined();
    expect(screen.getByText("Last Updated")).toBeDefined();

    // Strategy table
    expect(screen.getByText("Strategy Allocations")).toBeDefined();
    expect(screen.getByText("BTC/USDT")).toBeDefined();
    expect(screen.getByText("momentum")).toBeDefined();
    expect(screen.getByText("SOL/USDT")).toBeDefined();
    expect(screen.getByText("fr_reversal")).toBeDefined();
  });

  it("shows 'No strategy data available' when strategies are empty", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: { total_balance: 1000 },
    });
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("No strategy data available")).toBeDefined();
    });
  });

  it("shows warning when secondary APIs fail", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(
      screen.getByText(/Some sections failed to load/)
    ).toBeDefined();
  });

  it("renders execution mode filter", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("Portfolio")).toBeDefined();
    });

    // ExecutionModeFilter renders mode buttons
    expect(
      screen.getByRole("group", { name: "Execution mode filter" })
    ).toBeDefined();
  });

  it("derives strategy data from positions and opens the detail panel", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: {
        timestamp: "2026-03-16T08:00:00",
        positions: {
          btc_momentum: {
            equity: "1200.5",
            allocation_pct: "60",
            position_count: "2",
            last_signal_time: null,
          },
        },
      },
    } as unknown as typeof mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue(null as never);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(null as never);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC MOMENTUM")).toBeDefined();
    });

    expect(screen.getAllByText("$1,200.50").length).toBeGreaterThan(0);
    expect(screen.queryByText("N/A")).toBeNull();

    fireEvent.click(screen.getByText("BTC MOMENTUM"));

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Strategy Details" })
      ).toBeDefined();
    });

    expect(screen.getAllByText("unknown")[0]).toBeDefined();
    expect(screen.getByText("Position Count")).toBeDefined();
    expect(screen.getByText("Last Signal Time")).toBeDefined();
  });

  it("uses chart and allocation fallbacks when strategy data is empty", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: {
        total_equity: "900",
        strategies: {},
      },
    } as unknown as typeof mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue({
      data: [
        { date: "2026-03-15", balance: 900, daily_pnl: 0, cumulative_pnl: 0 },
      ],
      total_days: 1,
      start_date: "2026-03-15",
      end_date: "2026-03-15",
      initial_balance: 900,
    });
    vi.mocked(fetchStrategyPerformance).mockResolvedValue([
      {
        strategy: "grid",
        trade_count: 4,
        win_rate: 0.5,
        profit_factor: 1.2,
        sharpe: 0.8,
        avg_pnl: 3,
        max_dd: 12,
      },
    ]);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("No strategy data available")).toBeDefined();
    });

    const charts = screen.getAllByTestId("dynamic-chart");
    expect(charts[0].textContent).toContain('"daily_pnl":0');
    expect(charts[1].textContent).toContain('"name":"grid"');
    expect(charts[1].textContent).toContain('"value":4');
    expect(screen.getByText("N/A")).toBeDefined();
  });

  it("shows the default portfolio error for non-Error failures and retries", async () => {
    vi.mocked(fetchPortfolioState).mockRejectedValue("not-json-error");
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Failed to load portfolio state")).toBeDefined();

    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });
  });
});
