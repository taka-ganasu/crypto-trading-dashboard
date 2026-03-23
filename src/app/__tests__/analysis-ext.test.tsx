import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import type { DisplayCycle } from "@/components/CycleTable";
import type { AnalysisCycle, RegimeData } from "@/types";

const { cycleTableSpy, regimeTimelineSpy, timeRangeState } = vi.hoisted(() => ({
  cycleTableSpy: vi.fn(),
  regimeTimelineSpy: vi.fn(),
  timeRangeState: {
    start: "2026-03-10T00:00:00.000Z",
    end: "2026-03-17T00:00:00.000Z",
  },
}));

vi.mock("@/lib/api", () => ({
  fetchAnalysisCycles: vi.fn(),
  fetchRegimeData: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/TimeRangeFilter", () => ({
  __esModule: true,
  default: () => <div data-testid="time-range-filter">Time range filter</div>,
  useTimeRange: () => ({
    range: "7d",
    start: timeRangeState.start,
    end: timeRangeState.end,
  }),
}));

vi.mock("@/components/CycleTable", () => ({
  __esModule: true,
  default: ({ cycles }: { cycles: DisplayCycle[] }) => {
    cycleTableSpy(cycles);
    return <div data-testid="cycle-table">{cycles.length} cycles</div>;
  },
}));

vi.mock("@/components/RegimeTimeline", () => ({
  __esModule: true,
  default: ({ cycles }: { cycles: DisplayCycle[] }) => {
    regimeTimelineSpy(cycles);
    return <div data-testid="regime-timeline">{cycles.length} cycles</div>;
  },
}));

import AnalysisPage from "../analysis/page";
import { fetchAnalysisCycles, fetchRegimeData } from "@/lib/api";

function makeCycle(overrides: Partial<Record<keyof AnalysisCycle, unknown>> = {}): AnalysisCycle {
  return {
    id: 1,
    start_time: "2026-03-15T10:00:00Z",
    end_time: "2026-03-15T10:05:00Z",
    symbols_processed: "BTC/USDT",
    signals_generated: 0,
    trades_executed: 0,
    errors: null,
    duration_seconds: 300,
    regime_info: null,
    created_at: "2026-03-15T10:00:00Z",
    total_count: null,
    ...overrides,
  } as AnalysisCycle;
}

beforeEach(() => {
  timeRangeState.start = "2026-03-10T00:00:00.000Z";
  timeRangeState.end = "2026-03-17T00:00:00.000Z";
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Analysis Page — extended", () => {
  it("renders empty state when API returns an empty array", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    expect(screen.getAllByText("0 cycles")).toHaveLength(3);
    // Total Cycles=0, Total Signals=0 → two "0" values
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("0.0%")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
  });

  it("shows regime cards when fetchRegimeData returns data", async () => {
    const mockRegimeData: RegimeData[] = [
      {
        symbol: "BTC/USDT",
        regime: "trending",
        adx: 35.2,
        atr: 500,
        atr_zscore: 1.8,
        correlation: 0.45,
        timestamp: "2026-03-15T10:00:00Z",
      },
      {
        symbol: "SOL/USDT",
        regime: "ranging",
        adx: 15.1,
        atr: 200,
        atr_zscore: -0.3,
        correlation: 0.12,
        timestamp: "2026-03-15T10:00:00Z",
      },
    ];

    vi.mocked(fetchAnalysisCycles).mockResolvedValue([]);
    vi.mocked(fetchRegimeData).mockResolvedValue(mockRegimeData);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    expect(screen.getByText("SOL/USDT")).toBeDefined();
    expect(screen.getByText("Live Market Regime")).toBeDefined();
    expect(screen.getByText("Trending")).toBeDefined();
    expect(screen.getByText("Ranging")).toBeDefined();
    expect(screen.getByText("35.2")).toBeDefined();
    expect(screen.getByText("1.80")).toBeDefined();
  });

  it("handles fetchRegimeData failure gracefully (empty regime section)", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([makeCycle()]);
    vi.mocked(fetchRegimeData).mockRejectedValue(new Error("regime fail"));

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    // No regime cards should render, but page still works
    expect(screen.queryByText("Live Market Regime")).toBeNull();
    expect(screen.getByTestId("cycle-table")).toBeDefined();
  });

  it("computes stat cards correctly with mixed signal/trade counts", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([
      makeCycle({ id: 1, signals_generated: 5, trades_executed: 3 }),
      makeCycle({ id: 2, signals_generated: 10, trades_executed: 2 }),
      makeCycle({ id: 3, signals_generated: 0, trades_executed: 0 }),
    ]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    // Total signals: 15, Execution rate: 33.3%
    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getByText("33.3%")).toBeDefined();
    // 3 cycles displayed
    expect(screen.getAllByText("3 cycles")).toHaveLength(3);
  });

  it("uses total_count from first cycle when available", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([
      makeCycle({ id: 1, total_count: 500 }),
      makeCycle({ id: 2 }),
    ]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    // total_count overrides displayCycles.length for "Total Cycles"
    expect(screen.getByText("500")).toBeDefined();
  });

  it("handles non-Error rejection in fetchAnalysisCycles", async () => {
    vi.mocked(fetchAnalysisCycles).mockRejectedValue("string error");

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Data unavailable: string error")).toBeDefined();
  });

  it("sorts cycles by start_time ascending", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([
      makeCycle({ id: 3, start_time: "2026-03-15T12:00:00Z" }),
      makeCycle({ id: 1, start_time: "2026-03-15T08:00:00Z" }),
      makeCycle({ id: 2, start_time: "2026-03-15T10:00:00Z" }),
    ]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    const cycles = cycleTableSpy.mock.lastCall?.[0] as DisplayCycle[];
    expect(cycles.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("places cycles with null start_time first (time = 0)", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([
      makeCycle({ id: 2, start_time: "2026-03-15T10:00:00Z" }),
      makeCycle({ id: 1, start_time: null }),
    ]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    const cycles = cycleTableSpy.mock.lastCall?.[0] as DisplayCycle[];
    expect(cycles[0].id).toBe(1);
    expect(cycles[1].id).toBe(2);
  });
});
