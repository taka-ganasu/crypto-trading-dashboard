import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import type { DisplayCycle } from "@/components/CycleTable";
import type { AnalysisCycle } from "@/types";

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
import { fetchAnalysisCycles } from "@/lib/api";

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function lastRenderedCycles(): DisplayCycle[] {
  return (cycleTableSpy.mock.lastCall?.[0] ?? []) as DisplayCycle[];
}

beforeEach(() => {
  timeRangeState.start = "2026-03-10T00:00:00.000Z";
  timeRangeState.end = "2026-03-17T00:00:00.000Z";
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Analysis Page", () => {
  it("shows a loading spinner while the first request is pending", () => {
    vi.mocked(fetchAnalysisCycles).mockImplementation(() => new Promise(() => {}));

    render(<AnalysisPage />);

    expect(screen.getByText("Loading analysis...")).toBeDefined();
    expect(fetchAnalysisCycles).toHaveBeenCalledWith(100, timeRangeState.start, timeRangeState.end);
  });

  it("shows an alert when the API request fails", async () => {
    vi.mocked(fetchAnalysisCycles).mockRejectedValue(new Error("Network error"));

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Data unavailable: Network error")).toBeDefined();
    expect(screen.getByText("0.0%")).toBeDefined();
  });

  it("normalizes varied regime payloads, computes stats, and sorts cycles", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([
      makeCycle({
        id: "bad",
        start_time: null,
        signals_generated: "2%",
        trades_executed: "1",
        duration_seconds: "300",
        regime_info: "{\"market_regime\":\"volatile\",\"average_confidence\":\"45%\"}",
        total_count: "not-a-number",
      }),
      makeCycle({
        id: 2,
        start_time: "2026-03-15T09:00:00Z",
        signals_generated: 1,
        trades_executed: 0,
        regime_info: "\"bullish\"",
        total_count: "not-a-number",
      }),
      makeCycle({
        id: 3,
        start_time: "2026-03-15T10:00:00Z",
        signals_generated: 1,
        trades_executed: 1,
        regime_info: "{\"name\":\"range\",\"regime_confidence\":\"0.6\"}",
        total_count: "not-a-number",
      }),
      makeCycle({
        id: 4,
        start_time: "2026-03-15T11:00:00Z",
        signals_generated: 3,
        trades_executed: 1,
        regime_info: "{\"current_regime\":\"Macro Event\",\"avg_confidence\":\"0.25\"}",
        total_count: "not-a-number",
      }),
      makeCycle({
        id: 5,
        start_time: "2026-03-15T12:00:00Z",
        signals_generated: 1,
        trades_executed: 0,
        regime_info: "40%",
        total_count: "not-a-number",
      }),
      makeCycle({
        id: 6,
        start_time: "2026-03-15T13:00:00Z",
        signals_generated: 2,
        trades_executed: 1,
        regime_info: "{\"regime_type\":\"mystery\",\"confidence\":\"42\"}",
        total_count: "not-a-number",
      }),
      makeCycle({
        id: 7,
        start_time: "2026-03-15T14:00:00Z",
        signals_generated: " ",
        trades_executed: null,
        duration_seconds: null,
        regime_info: "   ",
        total_count: "not-a-number",
      }),
    ]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    expect(screen.getByTestId("time-range-filter")).toBeDefined();
    expect(screen.getAllByText("7 cycles")).toHaveLength(3);
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("40.0%")).toBeDefined();
    expect(screen.getByText("42.4%")).toBeDefined();

    const cycles = lastRenderedCycles();
    expect(cycles).toHaveLength(7);
    expect(cycles.map((cycle) => cycle.id)).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(cycles.map((cycle) => cycle.regime)).toEqual([
      "high_vol",
      "trending",
      "ranging",
      "macro_driven",
      "unknown",
      "unknown",
      "no_data",
    ]);
    expect(cycles.map((cycle) => cycle.confidence)).toEqual([45, null, 60, 25, 40, 42, null]);
    expect(regimeTimelineSpy).toHaveBeenCalledWith(cycles);
  });

  it("falls back to an empty result set when the API returns a non-array payload", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue({ cycles: [] } as unknown as AnalysisCycle[]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    expect(screen.getAllByText("0 cycles")).toHaveLength(3);
    expect(screen.getByText("0.0%")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(lastRenderedCycles()).toEqual([]);
  });

  it("returns to the loading state and refetches when the time range changes", async () => {
    const secondResponse = deferred<AnalysisCycle[]>();

    vi.mocked(fetchAnalysisCycles)
      .mockResolvedValueOnce([makeCycle({ total_count: 1 })])
      .mockImplementationOnce(() => secondResponse.promise);

    const { rerender } = render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    timeRangeState.start = "2026-03-11T00:00:00.000Z";
    timeRangeState.end = "2026-03-18T00:00:00.000Z";
    rerender(<AnalysisPage />);

    expect(screen.getByText("Loading analysis...")).toBeDefined();
    await waitFor(() => {
      expect(fetchAnalysisCycles).toHaveBeenLastCalledWith(
        100,
        "2026-03-11T00:00:00.000Z",
        "2026-03-18T00:00:00.000Z"
      );
    });

    secondResponse.resolve([]);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });
    expect(lastRenderedCycles()).toEqual([]);
  });
});
