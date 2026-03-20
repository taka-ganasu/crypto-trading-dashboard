/**
 * Extended Dashboard main page (Home) tests.
 *
 * Covers: per-section warning names, CB_BADGE unknown fallback,
 * toNumber edge cases, portfolio equity fallback, daily PnL coloring,
 * 30-second auto-refresh, trade link href, null entry_time dash.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api", () => ({
  fetchPortfolioState: vi.fn(),
  fetchCircuitBreakerState: vi.fn(),
  fetchTrades: vi.fn(),
  fetchBotHealth: vi.fn(),
  fetchSystemStatsOverview: vi.fn(),
}));

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
  data: { total_balance: 1000, daily_pnl: 50, daily_pnl_pct: 5.0 },
};
const mockCb = { data: { status: "NORMAL", recent_events: [] } };
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

function setupAllSuccess() {
  vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
  vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
  vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
  vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
  vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);
}

function setupAllFail() {
  vi.mocked(fetchPortfolioState).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchCircuitBreakerState).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchTrades).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchSystemStatsOverview).mockRejectedValue(new Error("fail"));
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
/* Warning message — per-section failure names                         */
/* ------------------------------------------------------------------ */

describe("Home — warning section names", () => {
  it("lists 'portfolio' when only portfolio fails", async () => {
    vi.mocked(fetchPortfolioState).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    const text = screen.getByRole("status").textContent!;
    expect(text).toContain("portfolio");
    expect(text).not.toContain("circuit breaker");
  });

  it("lists 'circuit breaker' when only CB fails", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByRole("status").textContent).toContain("circuit breaker");
  });

  it("lists 'recent trades' when only trades fails", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByRole("status").textContent).toContain("recent trades");
  });

  it("lists 'bot health' and 'system stats' when both fail", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemStatsOverview).mockRejectedValue(new Error("fail"));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    const text = screen.getByRole("status").textContent!;
    expect(text).toContain("bot health");
    expect(text).toContain("system stats");
  });

  it("shows warning (not error) when 4 of 5 sections fail", async () => {
    vi.mocked(fetchPortfolioState).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchCircuitBreakerState).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchTrades).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    // Warning, not full error
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Dashboard")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* CB_BADGE — unknown status fallback                                  */
/* ------------------------------------------------------------------ */

describe("Home — CB_BADGE fallback", () => {
  it("unknown CB status falls back to NORMAL badge styling", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue({
      data: { status: "UNKNOWN_STATE", recent_events: [] },
    });
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("UNKNOWN_STATE")).toBeDefined();
    });

    // UNKNOWN_STATE not in CB_BADGE → fallback to NORMAL colors
    const badge = screen.getByText("UNKNOWN_STATE");
    expect(badge.className).toContain("text-emerald-400");
  });

  it("null CB status normalizes to 'NORMAL'", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue({
      data: { status: null, recent_events: null },
    });
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("NORMAL")).toBeDefined();
    });
  });
});

/* ------------------------------------------------------------------ */
/* toNumber / portfolio fallback chain                                 */
/* ------------------------------------------------------------------ */

describe("Home — toNumber and portfolio fallbacks", () => {
  it("falls back to equity when total_balance is missing", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: { equity: 2500, daily_pnl: 0, daily_pnl_pct: 0 },
    });
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("$2,500.00")).toBeDefined();
    });
  });

  it("shows $0.00 when both total_balance and equity are missing", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: { daily_pnl: 0, daily_pnl_pct: 0 },
    });
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("$0.00")).toBeDefined();
    });
  });

  it("parses string equity correctly via toNumber", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: { total_balance: "1234.56", daily_pnl: "0", daily_pnl_pct: "0" },
    });
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("$1,234.56")).toBeDefined();
    });
  });
});

/* ------------------------------------------------------------------ */
/* Daily PnL coloring                                                  */
/* ------------------------------------------------------------------ */

describe("Home — daily PnL color", () => {
  it("negative daily PnL gets text-red-400", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: { total_balance: 1000, daily_pnl: -25, daily_pnl_pct: -2.5 },
    });
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/-\$25\.00/)).toBeDefined();
    });

    const pnlEl = screen.getByText(/-\$25\.00/);
    expect(pnlEl.className).toContain("text-red-400");
  });

  it("zero daily PnL gets text-emerald-400", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: { total_balance: 1000, daily_pnl: 0, daily_pnl_pct: 0 },
    });
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemStatsOverview).mockResolvedValue(mockStats);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
    });

    const pnlEl = screen.getByText(/\+\$0\.00/);
    expect(pnlEl.className).toContain("text-emerald-400");
  });
});

/* ------------------------------------------------------------------ */
/* Trade rendering edge cases                                          */
/* ------------------------------------------------------------------ */

describe("Home — trade rendering", () => {
  it("trade link has correct href with tradeId", async () => {
    setupAllSuccess();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    const link = screen.getByText("BTC/USDT").closest("a");
    expect(link?.getAttribute("href")).toBe("/trades?tradeId=1");
  });

  it("null entry_time renders as '—'", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCb);
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [
        {
          id: 5,
          symbol: "XRP/USDT",
          side: "BUY",
          entry_price: 1,
          exit_price: null,
          quantity: 100,
          pnl: null,
          pnl_pct: null,
          fees: null,
          entry_time: null,
          exit_time: null,
          exit_reason: null,
          strategy: "test",
          cycle_id: 5,
          created_at: "2026-03-20T00:00:00",
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
      expect(screen.getByText("XRP/USDT")).toBeDefined();
    });

    expect(screen.getByText("—")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Auto-refresh interval                                               */
/* ------------------------------------------------------------------ */

describe("Home — auto-refresh", () => {
  it("calls APIs again after 30 seconds", async () => {
    setupAllSuccess();

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
    });

    const callsAfterLoad = vi.mocked(fetchPortfolioState).mock.calls.length;

    // Advance 30 seconds to trigger one interval tick
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(vi.mocked(fetchPortfolioState).mock.calls.length).toBeGreaterThan(
        callsAfterLoad
      );
    });

    // All 5 APIs should have been called again
    const delta = vi.mocked(fetchPortfolioState).mock.calls.length - callsAfterLoad;
    expect(delta).toBeGreaterThanOrEqual(1);
    expect(vi.mocked(fetchCircuitBreakerState).mock.calls.length).toBeGreaterThan(callsAfterLoad);
    expect(vi.mocked(fetchTrades).mock.calls.length).toBeGreaterThan(callsAfterLoad);
  });

  it("clears interval on unmount", async () => {
    setupAllSuccess();

    const { unmount } = render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
    });

    unmount();

    // Advance time after unmount — should not trigger additional calls
    const callsBefore = vi.mocked(fetchPortfolioState).mock.calls.length;
    vi.advanceTimersByTime(60000);

    // Allow any pending microtasks
    await vi.advanceTimersByTimeAsync(0);

    expect(vi.mocked(fetchPortfolioState)).toHaveBeenCalledTimes(callsBefore);
  });
});
