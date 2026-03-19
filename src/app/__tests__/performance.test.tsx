import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { fireEvent, render, screen, cleanup, waitFor, within } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/performance",
}));

// Mock next/dynamic to render stub components
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => <div data-testid="dynamic-chart" />;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchPerformanceSummary: vi.fn(),
  fetchExecutionQuality: vi.fn(),
  fetchMarketSnapshots: vi.fn(),
  fetchEquityCurve: vi.fn(),
  fetchTradesByStrategy: vi.fn(),
}));

// Mock chartUtils
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

const mockSummary = {
  total_trades: 20,
  total_pnl: 250.5,
  win_rate: 0.65,
  profit_factor: 1.82,
  avg_slippage: 0.045,
  initial_balance: 1000,
};

const mockExecQuality = [
  {
    id: 1,
    trade_id: 1,
    expected_price: 50000,
    actual_price: 50010,
    slippage_pct: 0.02,
    api_latency_ms: 120,
    timestamp: "2026-03-15T10:00:00",
  },
  {
    id: 2,
    trade_id: 2,
    expected_price: 3000,
    actual_price: 2998,
    slippage_pct: 0.067,
    api_latency_ms: 85,
    timestamp: "2026-03-15T11:00:00",
  },
];

const mockSnapshots = [
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
];

const mockEquityCurve = {
  data: [
    { date: "2026-03-15", balance: 1250.5, daily_pnl: 50, cumulative_pnl: 250.5 },
  ],
  total_days: 1,
  start_date: "2026-03-15",
  end_date: "2026-03-15",
  initial_balance: 1000,
};

const mockDailyStrategyPnl = [
  { date: "2026-03-15", strategy: "momentum", trade_count: 3, daily_pnl: 50 },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setupMocksSuccess() {
  vi.mocked(fetchPerformanceSummary).mockResolvedValue(mockSummary);
  vi.mocked(fetchExecutionQuality).mockResolvedValue(mockExecQuality);
  vi.mocked(fetchMarketSnapshots).mockResolvedValue(mockSnapshots);
  vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
  vi.mocked(fetchTradesByStrategy).mockResolvedValue(mockDailyStrategyPnl);
}

function setupMocksAllFail() {
  vi.mocked(fetchPerformanceSummary).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchExecutionQuality).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMarketSnapshots).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchTradesByStrategy).mockRejectedValue(new Error("fail"));
}

describe("Performance Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchPerformanceSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchExecutionQuality).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchMarketSnapshots).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchEquityCurve).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchTradesByStrategy).mockReturnValue(new Promise(() => {}));

    render(<PerformancePage />);
    expect(screen.getByText("Loading performance data...")).toBeDefined();
  });

  it("shows error state when all APIs fail", async () => {
    setupMocksAllFail();

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(
      screen.getByText(/Error: Failed to load performance data/)
    ).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("retries loading after the error state", async () => {
    vi.mocked(fetchPerformanceSummary)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(mockSummary);
    vi.mocked(fetchExecutionQuality)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(mockExecQuality);
    vi.mocked(fetchMarketSnapshots)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(mockSnapshots);
    vi.mocked(fetchEquityCurve)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchTradesByStrategy)
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(mockDailyStrategyPnl);

    render(<PerformancePage />);

    const retryButton = await screen.findByRole("button", { name: "Retry" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Performance")).toBeDefined();
    });

    expect(vi.mocked(fetchPerformanceSummary).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(fetchExecutionQuality).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(fetchMarketSnapshots).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(fetchEquityCurve).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(vi.mocked(fetchTradesByStrategy).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("shows performance data on success", async () => {
    setupMocksSuccess();

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Performance")).toBeDefined();
    });

    // Summary cards
    expect(screen.getByText("Total PnL")).toBeDefined();
    expect(screen.getByText("Win Rate")).toBeDefined();
    expect(screen.getByText("Profit Factor")).toBeDefined();
    expect(screen.getByText("Avg Slippage")).toBeDefined();

    // Section headers
    expect(screen.getByText("Cumulative PnL")).toBeDefined();
    expect(screen.getByText("Equity Curve")).toBeDefined();
    expect(screen.getByText("Daily PnL by Strategy")).toBeDefined();
    expect(screen.getByText("Execution Quality")).toBeDefined();
    expect(screen.getByText("Market Snapshots")).toBeDefined();
  });

  it("shows execution quality table data", async () => {
    setupMocksSuccess();

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("#1")).toBeDefined();
    });

    expect(screen.getByText("#2")).toBeDefined();
    expect(
      screen.getByLabelText("Execution quality table")
    ).toBeDefined();
  });

  it("opens and closes execution details from a table row", async () => {
    setupMocksSuccess();

    render(<PerformancePage />);

    const firstTrade = await screen.findByText("#1");
    fireEvent.click(firstTrade.closest("tr") as HTMLTableRowElement);

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Execution Quality Details" })
      ).toBeDefined();
    });

    expect(screen.getByText("10.000000")).toBeDefined();
    expect(screen.getAllByText("#1")[0]).toBeDefined();

    fireEvent.click(screen.getByLabelText("Close panel"));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Execution Quality Details" })
      ).toBeNull();
    });
  });

  it("renders null fallback values in execution details and market snapshots", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue(mockSummary);
    vi.mocked(fetchExecutionQuality).mockResolvedValue([
      {
        id: 3,
        trade_id: null,
        expected_price: null,
        actual_price: null,
        slippage_pct: null,
        api_latency_ms: null,
        timestamp: "2026-03-15T12:00:00",
      },
    ]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([
      {
        id: 2,
        symbol: "ETH/USDT",
        price: null,
        rsi: null,
        adx: null,
        macd: null,
        volume: null,
        timestamp: "2026-03-15T12:00:00",
      },
    ]);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchTradesByStrategy).mockResolvedValue(mockDailyStrategyPnl);

    render(<PerformancePage />);

    const executionTable = await screen.findByLabelText("Execution quality table");
    fireEvent.click(within(executionTable).getAllByRole("row")[1] as HTMLTableRowElement);

    const dialog = await screen.findByRole("dialog", { name: "Execution Quality Details" });
    expect(within(dialog).getAllByText("—").length).toBeGreaterThanOrEqual(5);

    const snapshotsTable = screen.getByLabelText("Market snapshots table");
    const snapshotsRow = within(snapshotsTable).getAllByRole("row")[1];
    expect(within(snapshotsRow).getAllByText("-").length).toBe(3);
    expect(within(snapshotsRow).getAllByText("—").length).toBe(2);
  });

  it("shows market snapshot data", async () => {
    setupMocksSuccess();

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    expect(screen.getByText("55.3")).toBeDefined();
    expect(screen.getByText("25.1")).toBeDefined();
  });

  it("shows 'No execution data' when execution quality is empty", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue(mockSummary);
    vi.mocked(fetchExecutionQuality).mockResolvedValue([]);
    vi.mocked(fetchMarketSnapshots).mockResolvedValue([]);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchTradesByStrategy).mockResolvedValue(mockDailyStrategyPnl);

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("No execution data")).toBeDefined();
    });

    expect(screen.getByText("No snapshots")).toBeDefined();
  });

  it("shows warning when some APIs fail", async () => {
    vi.mocked(fetchPerformanceSummary).mockResolvedValue(mockSummary);
    vi.mocked(fetchExecutionQuality).mockResolvedValue(mockExecQuality);
    vi.mocked(fetchMarketSnapshots).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchTradesByStrategy).mockRejectedValue(new Error("fail"));

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(
      screen.getByText(/Some sections failed to load/)
    ).toBeDefined();
  });

  it("renders summary values correctly", async () => {
    setupMocksSuccess();

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("1.82")).toBeDefined();
    });

    // Win rate = 0.65 * 100 = 65.0%
    expect(screen.getByText("65.0%")).toBeDefined();
  });
});
