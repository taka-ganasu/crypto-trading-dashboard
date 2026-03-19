/**
 * Extended Trades page tests.
 *
 * Covers: side color classes, pagination edge cases (last page Next
 * disabled, fetchTrades offset param), detail panel field content,
 * and trade total count display.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/trades",
}));

vi.mock("@/lib/api", () => ({
  fetchTrades: vi.fn(),
}));

vi.mock("@/components/DetailPanel", () => ({
  default: ({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="detail-panel">
        <span>{title}</span>
        <button onClick={onClose} data-testid="close-panel">Close</button>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/components/DetailRow", () => ({
  default: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`detail-${label.toLowerCase().replace(/\s/g, "-")}`}>
      {label}: {value}
    </div>
  ),
}));

vi.mock("@/components/TimeRangeFilter", () => {
  const TimeRangeFilter = () => <div data-testid="time-range-filter" />;
  return {
    default: TimeRangeFilter,
    useTimeRange: () => ({ start: undefined, end: undefined }),
  };
});

vi.mock("@/components/ExecutionModeFilter", () => {
  const ExecutionModeFilter = () => <div data-testid="execution-mode-filter" />;
  return {
    default: ExecutionModeFilter,
    useExecutionMode: () => ({ apiExecutionMode: undefined }),
  };
});

import TradesPage from "../trades/page";
import { fetchTrades } from "@/lib/api";

function makeTrade(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    symbol: "BTC/USDT",
    side: "BUY",
    entry_price: 83000,
    exit_price: 84000,
    quantity: 0.01,
    pnl: 10.0,
    pnl_pct: 1.2,
    fees: 0.5,
    entry_time: "2026-03-15T10:00:00",
    exit_time: "2026-03-15T12:00:00",
    exit_reason: "take_profit",
    strategy: "momentum",
    cycle_id: 10,
    created_at: "2026-03-15T10:00:00",
    execution_mode: "live",
    ...overrides,
  };
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
/* Side color classes                                                   */
/* ------------------------------------------------------------------ */

describe("Trades — side color classes", () => {
  it("BUY side renders with text-emerald-400", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [makeTrade({ id: 1, side: "BUY" })],
      total: 1,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("BUY")).toBeDefined();
    });

    expect(screen.getByText("BUY").className).toContain("text-emerald-400");
  });

  it("SELL side renders with text-red-400", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [makeTrade({ id: 2, side: "SELL" })],
      total: 1,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("SELL")).toBeDefined();
    });

    expect(screen.getByText("SELL").className).toContain("text-red-400");
  });
});

/* ------------------------------------------------------------------ */
/* Pagination edge cases                                               */
/* ------------------------------------------------------------------ */

describe("Trades — pagination edge cases", () => {
  it("Next button disabled on last page", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [makeTrade()],
      total: 55,
      offset: 50,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Next")).toBeDefined();
    });

    // Navigate to page 2 (last page for 55 total with PAGE_SIZE=50)
    fireEvent.click(screen.getByText("Next"));

    await waitFor(() => {
      const nextBtn = screen.getByText("Next") as HTMLButtonElement;
      expect(nextBtn.disabled).toBe(true);
    });
  });

  it("fetchTrades receives correct offset for page 2", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [makeTrade()],
      total: 120,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Next")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Next"));

    await waitFor(() => {
      const calls = vi.mocked(fetchTrades).mock.calls;
      const lastCall = calls[calls.length - 1];
      // fetchTrades(symbol, limit, start, end, mode, offset)
      expect(lastCall[5]).toBe(50); // offset for page 2
    });
  });

  it("displays correct range text for multi-page", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [makeTrade()],
      total: 75,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("1-50 / 75")).toBeDefined();
    });
  });
});

/* ------------------------------------------------------------------ */
/* Detail panel field content                                          */
/* ------------------------------------------------------------------ */

describe("Trades — detail panel fields", () => {
  it("detail panel shows all trade fields including duration and fees", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [makeTrade({ id: 1, fees: 1.23, pnl: 15.5, pnl_pct: 2.5 })],
      total: 1,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    fireEvent.click(screen.getByText("BTC/USDT"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    // Check specific detail fields
    expect(screen.getByTestId("detail-trade-id")).toBeDefined();
    expect(screen.getByTestId("detail-symbol")).toBeDefined();
    expect(screen.getByTestId("detail-side")).toBeDefined();
    expect(screen.getByTestId("detail-pnl")).toBeDefined();
    expect(screen.getByTestId("detail-pnl-%")).toBeDefined();
    expect(screen.getByTestId("detail-strategy")).toBeDefined();
    expect(screen.getByTestId("detail-mode")).toBeDefined();
    expect(screen.getByTestId("detail-duration")).toBeDefined();
    expect(screen.getByTestId("detail-fees")).toBeDefined();
  });

  it("detail panel shows 'Open' for trade without exit info", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [
        makeTrade({
          id: 3,
          exit_price: null,
          exit_time: null,
          pnl: null,
          pnl_pct: null,
          fees: null,
          strategy: null,
          execution_mode: null,
        }),
      ],
      total: 1,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    fireEvent.click(screen.getByText("BTC/USDT"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    // Open trade: exit price, exit date, and duration show "Open"
    const exitPrice = screen.getByTestId("detail-exit-price");
    expect(exitPrice.textContent).toContain("Open");

    const duration = screen.getByTestId("detail-duration");
    expect(duration.textContent).toContain("Open");

    // Null strategy/mode show "—"
    const strategy = screen.getByTestId("detail-strategy");
    expect(strategy.textContent).toContain("—");

    const mode = screen.getByTestId("detail-mode");
    expect(mode.textContent).toContain("—");
  });
});

/* ------------------------------------------------------------------ */
/* Trade count display                                                 */
/* ------------------------------------------------------------------ */

describe("Trades — trade count", () => {
  it("shows correct trade count in header", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: Array.from({ length: 5 }, (_, i) =>
        makeTrade({ id: i + 1, symbol: `T${i}/USDT` })
      ),
      total: 200,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("200 trades")).toBeDefined();
    });
  });
});
