import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock API functions
vi.mock("@/lib/api", () => ({
  fetchPortfolioState: vi.fn(),
  fetchCircuitBreakerState: vi.fn(),
  fetchTrades: vi.fn(),
  fetchBotHealth: vi.fn(),
  fetchSystemStatsOverview: vi.fn(),
}));

// Mock child components to isolate page logic
vi.mock("@/components/StatsOverviewCards", () => ({
  default: ({ stats, error }: { stats: unknown; error: string | null }) => (
    <div data-testid="stats-overview-cards">
      {error && <span>{error}</span>}
      {stats && <span>Stats loaded</span>}
    </div>
  ),
}));

vi.mock("@/components/SystemStatusWidget", () => ({
  default: ({
    health,
    error,
  }: {
    health: unknown;
    error: string | null;
  }) => (
    <div data-testid="system-status-widget">
      {error && <span>{error}</span>}
      {health && <span>Health loaded</span>}
    </div>
  ),
}));

import Home from "../page";
import {
  fetchPortfolioState,
  fetchCircuitBreakerState,
  fetchTrades,
  fetchBotHealth,
  fetchSystemStatsOverview,
} from "@/lib/api";

const mockPortfolio = {
  data: {
    total_balance: 1000,
    daily_pnl: 50,
    daily_pnl_pct: 5.0,
  },
};

const mockCb = {
  data: { status: "NORMAL", recent_events: [] },
};

const mockTrades = {
  trades: [
    {
      id: 1,
      symbol: "BTC/USDT",
      side: "BUY",
      entry_price: 50000,
      exit_price: 51000,
      quantity: 0.01,
      pnl: 10,
      pnl_pct: 2.0,
      fees: 0.5,
      entry_time: "2026-03-15T10:00:00",
      exit_time: "2026-03-15T11:00:00",
      exit_reason: "take_profit",
      strategy: "momentum",
      cycle_id: 1,
      created_at: "2026-03-15T10:00:00",
      execution_mode: "live",
    },
  ],
  total: 1,
  offset: 0,
  limit: 3,
};

const mockHealth = { status: "healthy", api_version: "1.0.0" };
const mockStats = { recent_trades: 10, recent_signals: 5 };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setupMocksSuccess() {
  vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
  vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
  vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
  vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
  vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);
}

function setupMocksAllFail() {
  vi.mocked(fetchPortfolioState).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchCircuitBreakerState).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchTrades).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchSystemStatsOverview).mockRejectedValue(new Error("fail"));
}

describe("Home (Dashboard) Page", () => {
  it("shows loading spinner initially", () => {
    // Never resolve so loading stays
    vi.mocked(fetchPortfolioState).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchCircuitBreakerState).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchTrades).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchBotHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchSystemStatsOverview).mockReturnValue(new Promise(() => {}));

    render(<Home />);
    expect(screen.getByText("Loading dashboard...")).toBeDefined();
  });

  it("shows error state when all APIs fail", async () => {
    setupMocksAllFail();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Failed to load dashboard data.")).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("shows dashboard data on success", async () => {
    setupMocksSuccess();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
    });

    // Total Balance card
    expect(screen.getByText("Total Balance")).toBeDefined();
    expect(screen.getByText("$1,000.00")).toBeDefined();

    // Daily PnL card
    expect(screen.getByText("Daily PnL")).toBeDefined();

    // Circuit Breaker card
    expect(screen.getByText("Circuit Breaker")).toBeDefined();
    expect(screen.getByText("NORMAL")).toBeDefined();

    // Recent trade
    expect(screen.getByText("BTC/USDT")).toBeDefined();
    expect(screen.getByText("BUY")).toBeDefined();
  });

  it("shows 'No trades yet' when trades list is empty", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [],
      total: 0,
      offset: 0,
      limit: 3,
    });
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("No trades yet")).toBeDefined();
    });
  });

  it("shows warning when some APIs fail", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [],
      total: 0,
      offset: 0,
      limit: 3,
    });
    vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemStatsOverview).mockRejectedValue(new Error("fail"));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(
      screen.getByText(/Some sections failed to load/)
    ).toBeDefined();
  });

  it("displays trade execution mode badge", async () => {
    setupMocksSuccess();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("LIVE")).toBeDefined();
    });
  });

  it("displays trade with null pnl as 'Open'", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [
        {
          id: 2,
          symbol: "ETH/USDT",
          side: "SELL",
          entry_price: 3000,
          exit_price: null,
          quantity: 0.1,
          pnl: null,
          pnl_pct: null,
          fees: null,
          entry_time: "2026-03-15T12:00:00",
          exit_time: null,
          exit_reason: null,
          strategy: "fr_reversal",
          cycle_id: 2,
          created_at: "2026-03-15T12:00:00",
          execution_mode: null,
        },
      ],
      total: 1,
      offset: 0,
      limit: 3,
    });
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeDefined();
    });

    expect(screen.getByText("SELL")).toBeDefined();
    expect(screen.getByText("ETH/USDT")).toBeDefined();
  });
});
