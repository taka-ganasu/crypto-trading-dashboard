import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/trades",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchTrades: vi.fn(),
}));

// Mock child components
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
        <button onClick={onClose} data-testid="close-panel">
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/components/DetailRow", () => ({
  default: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="detail-row">
      {label}: {value}
    </div>
  ),
}));

vi.mock("@/components/TimeRangeFilter", () => {
  const TimeRangeFilter = () => (
    <div data-testid="time-range-filter">TimeRangeFilter</div>
  );
  return {
    default: TimeRangeFilter,
    useTimeRange: () => ({ start: undefined, end: undefined }),
  };
});

vi.mock("@/components/ExecutionModeFilter", () => {
  const ExecutionModeFilter = () => (
    <div data-testid="execution-mode-filter">ExecutionModeFilter</div>
  );
  return {
    default: ExecutionModeFilter,
    useExecutionMode: () => ({ apiExecutionMode: undefined }),
  };
});

import TradesPage from "../trades/page";
import { fetchTrades } from "@/lib/api";

const mockTradesResponse = {
  trades: [
    {
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
    },
    {
      id: 2,
      symbol: "ETH/USDT",
      side: "SELL",
      entry_price: 3000,
      exit_price: 2950,
      quantity: 0.1,
      pnl: 5.0,
      pnl_pct: 0.5,
      fees: 0.3,
      entry_time: "2026-03-15T11:00:00",
      exit_time: "2026-03-15T13:00:00",
      exit_reason: "stop_loss",
      strategy: "fr_reversal",
      cycle_id: 11,
      created_at: "2026-03-15T11:00:00",
      execution_mode: "paper",
    },
  ],
  total: 2,
  offset: 0,
  limit: 50,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Trades Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchTrades).mockReturnValue(new Promise(() => {}));

    render(<TradesPage />);
    expect(screen.getByText("Loading trades...")).toBeDefined();
  });

  it("shows error state when API fails", async () => {
    vi.mocked(fetchTrades).mockRejectedValue(new Error("Network error"));

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText(/Data unavailable/)).toBeDefined();
  });

  it("shows trades data on success", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Trade History")).toBeDefined();
    });

    // Trade rows
    expect(screen.getByText("BTC/USDT")).toBeDefined();
    expect(screen.getByText("ETH/USDT")).toBeDefined();
    expect(screen.getByText("BUY")).toBeDefined();
    expect(screen.getByText("SELL")).toBeDefined();

    // Trades table
    expect(screen.getByLabelText("Trades table")).toBeDefined();

    // Trade count
    expect(screen.getByText("2 trades")).toBeDefined();
  });

  it("shows 'No trades found' when trades list is empty", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [],
      total: 0,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("No trades found")).toBeDefined();
    });
  });

  it("shows execution mode badges correctly", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    // execution_mode display
    expect(screen.getByText("Live")).toBeDefined();
    expect(screen.getByText("Paper")).toBeDefined();
  });

  it("shows strategy names", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("momentum")).toBeDefined();
    });

    expect(screen.getByText("fr_reversal")).toBeDefined();
  });

  it("shows open trade (null exit_price and exit_time)", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [
        {
          id: 3,
          symbol: "SOL/USDT",
          side: "BUY",
          entry_price: 150,
          exit_price: null,
          quantity: 1,
          pnl: null,
          pnl_pct: null,
          fees: null,
          entry_time: "2026-03-15T14:00:00",
          exit_time: null,
          exit_reason: null,
          strategy: null,
          cycle_id: null,
          created_at: "2026-03-15T14:00:00",
          execution_mode: null,
        },
      ],
      total: 1,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("SOL/USDT")).toBeDefined();
    });

    // Open trade markers
    const openLabels = screen.getAllByText("Open");
    expect(openLabels.length).toBeGreaterThanOrEqual(2);

    // Null strategy shows as "-"
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows dry_run execution mode as 'Dry Run'", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: [
        {
          id: 4,
          symbol: "XRP/USDT",
          side: "BUY",
          entry_price: 0.6,
          exit_price: 0.65,
          quantity: 100,
          pnl: 5.0,
          pnl_pct: 8.3,
          fees: 0.1,
          entry_time: "2026-03-15T15:00:00",
          exit_time: "2026-03-15T16:00:00",
          exit_reason: "take_profit",
          strategy: "momentum",
          cycle_id: 12,
          created_at: "2026-03-15T15:00:00",
          execution_mode: "dry_run",
        },
      ],
      total: 1,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Dry Run")).toBeDefined();
    });
  });

  it("renders filter components", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Trade History")).toBeDefined();
    });

    expect(screen.getByTestId("time-range-filter")).toBeDefined();
    expect(screen.getByTestId("execution-mode-filter")).toBeDefined();
  });

  it("opens detail panel on trade row click", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    // Click on first trade row
    fireEvent.click(screen.getByText("BTC/USDT"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    expect(screen.getByText("Trade Details")).toBeDefined();
  });

  it("does not show pagination when total fits one page", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Trade History")).toBeDefined();
    });

    expect(screen.queryByText("Prev")).toBeNull();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("shows pagination when more than 50 trades", async () => {
    vi.mocked(fetchTrades).mockResolvedValue({
      trades: mockTradesResponse.trades,
      total: 120,
      offset: 0,
      limit: 50,
    });

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Trade History")).toBeDefined();
    });

    expect(screen.getByText("Prev")).toBeDefined();
    expect(screen.getByText("Next")).toBeDefined();
    expect(screen.getByText("1-50 / 120")).toBeDefined();
  });

  it("shows table headers", async () => {
    vi.mocked(fetchTrades).mockResolvedValue(mockTradesResponse);

    render(<TradesPage />);

    await waitFor(() => {
      expect(screen.getByText("Trade History")).toBeDefined();
    });

    expect(screen.getByText("Symbol")).toBeDefined();
    expect(screen.getByText("Side")).toBeDefined();
    expect(screen.getByText("Mode")).toBeDefined();
    expect(screen.getByText("Strategy")).toBeDefined();
    expect(screen.getByText("Size")).toBeDefined();
    expect(screen.getByText("Entry Price")).toBeDefined();
    expect(screen.getByText("Exit Price")).toBeDefined();
    expect(screen.getByText("PnL")).toBeDefined();
    expect(screen.getByText("Entry Date")).toBeDefined();
    expect(screen.getByText("Exit Date")).toBeDefined();
  });
});
