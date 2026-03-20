/**
 * Extended Portfolio page tests — allocation formatting, PnL coloring,
 * detail panel fields, totalEquity derivation, lastUpdated fallback.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/portfolio",
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = (props: { data?: unknown }) => (
      <div data-testid="dynamic-chart">{JSON.stringify(props)}</div>
    );
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

vi.mock("@/lib/api", () => ({
  fetchPortfolioState: vi.fn(),
  fetchEquityCurve: vi.fn(),
  fetchStrategyPerformance: vi.fn(),
}));

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

function makePortfolio(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      total_balance: 5000,
      last_updated: "2026-03-15T10:00:00",
      strategies: {
        btc_momentum: {
          symbol: "BTC/USDT",
          strategy: "momentum",
          allocation_pct: 60,
          equity: 3000,
          initial_equity: 2500,
          position_count: 3,
          last_signal_time: "2026-03-15T09:00:00",
        },
        sol_fr: {
          symbol: "SOL/USDT",
          strategy: "fr_reversal",
          allocation_pct: 40,
          equity: 2000,
          initial_equity: 2500,
          position_count: null,
          last_signal_time: null,
        },
      },
      ...overrides,
    },
  };
}

const mockEquityCurve = {
  data: [{ date: "2026-03-15", balance: 5000, daily_pnl: 100, cumulative_pnl: 100 }],
  total_days: 1,
  start_date: "2026-03-15",
  end_date: "2026-03-15",
  initial_balance: 5000,
};

const mockStrategyPerf = [
  { strategy: "momentum", trade_count: 10, win_rate: 0.6, profit_factor: 1.5, sharpe: 1.2, avg_pnl: 5, max_dd: 50 },
];

function setupSuccess(portfolioOverrides: Record<string, unknown> = {}) {
  vi.mocked(fetchPortfolioState).mockResolvedValue(makePortfolio(portfolioOverrides));
  vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
  vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);
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
/* Allocation % formatting                                             */
/* ------------------------------------------------------------------ */

describe("Portfolio — allocation formatting", () => {
  it("displays allocation percentages with 1 decimal", async () => {
    setupSuccess();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    // 60.0% and 40.0% in the allocation column
    expect(screen.getByText("60.0%")).toBeDefined();
    expect(screen.getByText("40.0%")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* PnL coloring                                                        */
/* ------------------------------------------------------------------ */

describe("Portfolio — PnL coloring", () => {
  it("positive PnL strategy row has text-emerald-400", async () => {
    setupSuccess();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    // BTC: equity 3000, initial 2500, pnl = +500
    const btcRow = screen.getByText("BTC/USDT").closest("tr") as HTMLTableRowElement;
    const btcPnlCells = within(btcRow).getAllByText(/\+/);
    const pnlCell = btcPnlCells.find((el) => el.className.includes("text-emerald-400"));
    expect(pnlCell).toBeDefined();
  });

  it("negative PnL strategy row has text-red-400", async () => {
    setupSuccess();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("SOL/USDT")).toBeDefined();
    });

    // SOL: equity 2000, initial 2500, pnl = -500
    const solRow = screen.getByText("SOL/USDT").closest("tr") as HTMLTableRowElement;
    const solPnlCells = within(solRow).getAllByText(/-/);
    const pnlCell = solPnlCells.find((el) => el.className.includes("text-red-400"));
    expect(pnlCell).toBeDefined();
  });

  it("total PnL card shows correct color for net zero PnL", async () => {
    // BTC: +500, SOL: -500, net = 0 → colorByPnl(0) = text-emerald-400
    setupSuccess();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("Total PnL")).toBeDefined();
    });

    // The colorByPnl class is on the <p> element containing the PnL value
    const totalPnlCard = screen.getByText("Total PnL").closest("div") as HTMLElement;
    const pElements = totalPnlCard.querySelectorAll("p");
    const pnlP = Array.from(pElements).find((p) => p.className.includes("font-bold"));
    expect(pnlP).toBeDefined();
    expect(pnlP!.className).toContain("text-emerald-400");
  });
});

/* ------------------------------------------------------------------ */
/* Detail panel fields                                                 */
/* ------------------------------------------------------------------ */

describe("Portfolio — detail panel", () => {
  it("shows all strategy detail fields on click", async () => {
    setupSuccess();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    fireEvent.click(screen.getByText("BTC/USDT"));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Strategy Details" })).toBeDefined();
    });

    const dialog = screen.getByRole("dialog", { name: "Strategy Details" });
    expect(within(dialog).getByText("Strategy Name")).toBeDefined();
    expect(within(dialog).getByText("Symbol")).toBeDefined();
    expect(within(dialog).getByText("Allocation %")).toBeDefined();
    expect(within(dialog).getByText("Current Value")).toBeDefined();
    expect(within(dialog).getByText("PnL")).toBeDefined();
    expect(within(dialog).getByText("PnL %")).toBeDefined();
    expect(within(dialog).getByText("Position Count")).toBeDefined();
    expect(within(dialog).getByText("Last Signal Time")).toBeDefined();
  });

  it("shows '—' for null position_count and last_signal_time", async () => {
    setupSuccess();
    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("SOL/USDT")).toBeDefined();
    });

    // SOL has position_count: null and last_signal_time: null
    fireEvent.click(screen.getByText("SOL/USDT"));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Strategy Details" })).toBeDefined();
    });

    const dialog = screen.getByRole("dialog", { name: "Strategy Details" });
    // Should have at least 2 "—" entries (position count and last signal time)
    const dashes = within(dialog).getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});

/* ------------------------------------------------------------------ */
/* totalEquity derivation                                              */
/* ------------------------------------------------------------------ */

describe("Portfolio — totalEquity derivation", () => {
  it("derives totalEquity from strategy equities when API total is null", async () => {
    // No total_balance, equity, or total_equity → should derive from strategies
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: {
        strategies: {
          a: { symbol: "A", strategy: "x", allocation_pct: 50, equity: 1000, initial_equity: 1000 },
          b: { symbol: "B", strategy: "y", allocation_pct: 50, equity: 500, initial_equity: 500 },
        },
      },
    } as ReturnType<typeof makePortfolio>);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Value")).toBeDefined();
    });

    // 1000 + 500 = 1500 → $1,500.00
    expect(screen.getByText("$1,500.00")).toBeDefined();
  });

  it("uses equity fallback when total_balance is missing", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: {
        equity: 7777,
        last_updated: "2026-03-15T10:00:00",
        strategies: {},
      },
    } as ReturnType<typeof makePortfolio>);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("$7,777.00")).toBeDefined();
    });
  });
});

/* ------------------------------------------------------------------ */
/* lastUpdated fallback chain                                          */
/* ------------------------------------------------------------------ */

describe("Portfolio — lastUpdated fallback", () => {
  it("shows 'N/A' when neither last_updated nor timestamp is present", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: {
        total_balance: 1000,
        strategies: {},
      },
    } as ReturnType<typeof makePortfolio>);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("N/A")).toBeDefined();
    });
  });

  it("falls back to timestamp when last_updated is absent", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue({
      data: {
        total_balance: 1000,
        timestamp: "2026-03-16T08:00:00",
        strategies: {},
      },
    } as ReturnType<typeof makePortfolio>);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("Last Updated")).toBeDefined();
    });

    // Should NOT show "N/A" since timestamp exists
    expect(screen.queryByText("N/A")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Warning message content                                             */
/* ------------------------------------------------------------------ */

describe("Portfolio — warning message specifics", () => {
  it("warning lists 'daily PnL chart' when equity curve fails", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(makePortfolio());
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("timeout"));
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText(/daily PnL chart/)).toBeDefined();
    });
  });

  it("warning lists 'strategy performance' when perf API fails", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(makePortfolio());
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("timeout"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText(/strategy performance/)).toBeDefined();
    });
  });
});
