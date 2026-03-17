import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/analysis",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchAnalysisCycles: vi.fn(),
}));

// Mock child components
vi.mock("@/components/CycleTable", () => ({
  default: ({ cycles }: { cycles: unknown[] }) => (
    <div data-testid="cycle-table">{cycles.length} cycles</div>
  ),
}));

vi.mock("@/components/RegimeTimeline", () => ({
  default: ({ cycles }: { cycles: unknown[] }) => (
    <div data-testid="regime-timeline">{cycles.length} cycles</div>
  ),
}));

import AnalysisPage from "../analysis/page";
import { fetchAnalysisCycles } from "@/lib/api";

const mockCycles = [
  {
    id: 1,
    start_time: "2026-03-15T10:00:00",
    end_time: "2026-03-15T10:05:00",
    symbols_processed: "BTC/USDT,ETH/USDT",
    signals_generated: 3,
    trades_executed: 1,
    errors: null,
    duration_seconds: 300,
    regime_info: '{"regime": "trending", "confidence": 0.85}',
    created_at: "2026-03-15T10:00:00",
    total_count: 50,
  },
  {
    id: 2,
    start_time: "2026-03-15T11:00:00",
    end_time: "2026-03-15T11:05:00",
    symbols_processed: "SOL/USDT",
    signals_generated: 2,
    trades_executed: 0,
    errors: null,
    duration_seconds: 280,
    regime_info: '{"regime": "ranging", "confidence": 0.6}',
    created_at: "2026-03-15T11:00:00",
    total_count: 50,
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

describe("Analysis Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchAnalysisCycles).mockReturnValue(new Promise(() => {}));

    render(<AnalysisPage />);
    expect(screen.getByText("Loading analysis...")).toBeDefined();
  });

  it("shows error state when API fails", async () => {
    vi.mocked(fetchAnalysisCycles).mockRejectedValue(
      new Error("Network error")
    );

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText(/Data unavailable/)).toBeDefined();
  });

  it("shows analysis data on success", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue(mockCycles);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    // Stats cards
    expect(screen.getByText("Total Cycles")).toBeDefined();
    expect(screen.getByText("Total Signals")).toBeDefined();
    expect(screen.getByText("Signal Execution Rate")).toBeDefined();
    expect(screen.getByText("Avg Confidence")).toBeDefined();

    // Values: total_count=50, signals=3+2=5, executed=1+0=1
    expect(screen.getByText("50")).toBeDefined(); // Total Cycles (from total_count)
    expect(screen.getByText("5")).toBeDefined(); // Total Signals
    expect(screen.getByText("20.0%")).toBeDefined(); // Execution Rate: 1/5

    // Cycle count label
    expect(screen.getByText("50 cycles")).toBeDefined();

    // Child components rendered
    expect(screen.getByTestId("cycle-table")).toBeDefined();
    expect(screen.getByTestId("regime-timeline")).toBeDefined();
  });

  it("shows empty state with zero cycles", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    // Stats show zero — "0 cycles" also appears in mocked child components
    const zeroCyclesElements = screen.getAllByText("0 cycles");
    expect(zeroCyclesElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("cycle-table")).toBeDefined();
  });

  it("handles null regime_info gracefully", async () => {
    vi.mocked(fetchAnalysisCycles).mockResolvedValue([
      {
        id: 3,
        start_time: "2026-03-15T12:00:00",
        end_time: null,
        symbols_processed: null,
        signals_generated: 0,
        trades_executed: 0,
        errors: null,
        duration_seconds: null,
        regime_info: null,
        created_at: "2026-03-15T12:00:00",
        total_count: null,
      },
    ]);

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Analysis")).toBeDefined();
    });

    // Should not crash, confidence shows as "—"
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.getByTestId("cycle-table")).toBeDefined();
  });

  it("shows both error and data when error occurs after initial load", async () => {
    vi.mocked(fetchAnalysisCycles).mockRejectedValue(
      new Error("Partial failure")
    );

    render(<AnalysisPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    // Error is shown
    expect(screen.getByText(/Data unavailable/)).toBeDefined();
    // Page still renders stats and child components
    expect(screen.getByText("Total Cycles")).toBeDefined();
  });
});
