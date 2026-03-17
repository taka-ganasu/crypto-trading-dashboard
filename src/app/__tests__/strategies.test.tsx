import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/strategies",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchStrategies: vi.fn(),
  fetchStrategyPerformance: vi.fn(),
  fetchSystemStatsOverview: vi.fn(),
}));

import StrategiesPage from "../strategies/page";
import {
  fetchStrategies,
  fetchStrategyPerformance,
  fetchSystemStatsOverview,
} from "@/lib/api";

const mockPerformance = [
  {
    strategy: "BTC Momentum",
    trade_count: 25,
    win_rate: 0.6,
    profit_factor: 1.5,
    sharpe: 1.2,
    avg_pnl: 8.5,
    max_dd: 120,
  },
  {
    strategy: "SOL FR Reversal",
    trade_count: 18,
    win_rate: 0.55,
    profit_factor: 1.3,
    sharpe: 0.9,
    avg_pnl: -2.1,
    max_dd: 80,
  },
  {
    strategy: "XRP Momentum",
    trade_count: 12,
    win_rate: 0.5,
    profit_factor: 1.0,
    sharpe: null,
    avg_pnl: null,
    max_dd: null,
  },
];

const mockStrategiesResp = {
  active_plan: "plan_6b",
  strategies: [],
};

const mockStats = { recent_trades: 55 };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setupMocksSuccess() {
  vi.mocked(fetchStrategies).mockResolvedValue(mockStrategiesResp);
  vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockPerformance);
  vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);
}

describe("Strategies Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchStrategies).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchStrategyPerformance).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchSystemStatsOverview).mockReturnValue(new Promise(() => {}));

    render(<StrategiesPage />);
    expect(screen.getByText("Loading strategy data...")).toBeDefined();
  });

  it("shows error state when APIs fail and no data", async () => {
    vi.mocked(fetchStrategies).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemStatsOverview).mockRejectedValue(new Error("fail"));

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(
      screen.getByText(/Failed to load strategy data/)
    ).toBeDefined();
  });

  it("shows empty state when no performance data", async () => {
    vi.mocked(fetchStrategies).mockResolvedValue(mockStrategiesResp);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue([]);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No trades yet for this execution mode.")
      ).toBeDefined();
    });
  });

  it("shows strategy cards and comparison table on success", async () => {
    setupMocksSuccess();

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Strategies")).toBeDefined();
    });

    // Strategy count
    expect(screen.getByText("3 strategies")).toBeDefined();

    // Strategy names appear in both cards and table (2 each)
    expect(screen.getAllByText("BTC Momentum")).toHaveLength(2);
    expect(screen.getAllByText("SOL FR Reversal")).toHaveLength(2);
    expect(screen.getAllByText("XRP Momentum")).toHaveLength(2);

    // Trade counts in cards
    expect(screen.getByText("25 trades")).toBeDefined();
    expect(screen.getByText("18 trades")).toBeDefined();
    expect(screen.getByText("12 trades")).toBeDefined();

    // Comparison table
    expect(screen.getByText("Detail Comparison")).toBeDefined();
    expect(
      screen.getByLabelText("Strategy comparison table")
    ).toBeDefined();
  });

  it("shows null values as dashes", async () => {
    setupMocksSuccess();

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("XRP Momentum")).toHaveLength(2);
    });

    // XRP Momentum has null sharpe, avg_pnl, max_dd — these display as "—"
    // Card has 1 dash (avg_pnl), table has 3 dashes (sharpe, avg_pnl, max_dd)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("shows warning when some APIs fail but data exists", async () => {
    vi.mocked(fetchStrategies).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockPerformance);
    vi.mocked(fetchSystemStatsOverview).mockRejectedValue(new Error("fail"));

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(
      screen.getByText(/Some sources failed to load/)
    ).toBeDefined();
    // Data still shows (in both card and table)
    expect(screen.getAllByText("BTC Momentum")).toHaveLength(2);
  });

  it("renders execution mode filter", async () => {
    setupMocksSuccess();

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Strategies")).toBeDefined();
    });

    expect(
      screen.getByRole("group", { name: "Execution mode filter" })
    ).toBeDefined();
  });

  it("renders sortable column headers", async () => {
    setupMocksSuccess();

    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Detail Comparison")).toBeDefined();
    });

    expect(screen.getByLabelText("Win Rate")).toBeDefined();
    expect(screen.getByLabelText("Profit Factor")).toBeDefined();
    expect(screen.getByLabelText("Sharpe")).toBeDefined();
  });
});
