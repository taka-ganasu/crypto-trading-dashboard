import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/signals",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchSignals: vi.fn(),
}));

// Mock child components
vi.mock("@/components/DetailPanel", () => ({
  default: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div data-testid="detail-panel">{children}</div> : null),
}));

vi.mock("@/components/DetailRow", () => ({
  default: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="detail-row">
      {label}: {value}
    </div>
  ),
}));

import SignalsPage from "../signals/page";
import { fetchSignals } from "@/lib/api";

const mockSignalsResponse = {
  signals: [
    {
      id: 1,
      timestamp: "2026-03-15T10:00:00",
      symbol: "BTC/USDT",
      action: "buy",
      score: 0.85,
      confidence: 72.5,
      executed: 1,
      skip_reason: null,
      strategy_type: "momentum",
      cycle_id: 10,
      created_at: "2026-03-15T10:00:00",
    },
    {
      id: 2,
      timestamp: "2026-03-15T11:00:00",
      symbol: "ETH/USDT",
      action: "sell",
      score: 0.42,
      confidence: 55.0,
      executed: 0,
      skip_reason: "confidence_below_threshold",
      strategy_type: "fr_reversal",
      cycle_id: 11,
      created_at: "2026-03-15T11:00:00",
    },
  ],
  total: 2,
  offset: 0,
  limit: 25,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Signals Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchSignals).mockReturnValue(new Promise(() => {}));

    render(<SignalsPage />);
    expect(screen.getByText("Loading signals...")).toBeDefined();
  });

  it("shows error state when API fails", async () => {
    vi.mocked(fetchSignals).mockRejectedValue(new Error("Network error"));

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText(/Data unavailable/)).toBeDefined();
  });

  it("shows signals data on success", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mockSignalsResponse);

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Signals")).toBeDefined();
    });

    // Stats cards
    expect(screen.getByText("Total Signals")).toBeDefined();
    // "Executed" appears both in stats card and table header — use getAllByText
    expect(screen.getAllByText("Executed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Execution Rate")).toBeDefined();
    expect(screen.getByText("Avg Confidence")).toBeDefined();

    // Signal rows
    expect(screen.getByText("BTC/USDT")).toBeDefined();
    expect(screen.getByText("ETH/USDT")).toBeDefined();
    expect(screen.getByText("BUY")).toBeDefined();
    expect(screen.getByText("SELL")).toBeDefined();

    // Signals table
    expect(screen.getByLabelText("Signals table")).toBeDefined();
  });

  it("shows 'No signals found' when signals list is empty", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [],
      total: 0,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("No signals found")).toBeDefined();
    });
  });

  it("shows null score and confidence as dashes", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [
        {
          id: 3,
          timestamp: "2026-03-15T12:00:00",
          symbol: "SOL/USDT",
          action: "buy",
          score: null,
          confidence: null,
          executed: 0,
          skip_reason: null,
          strategy_type: null,
          cycle_id: null,
          created_at: "2026-03-15T12:00:00",
        },
      ],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("SOL/USDT")).toBeDefined();
    });

    // Null score and confidence display as "-"
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("renders execution status filter", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mockSignalsResponse);

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Signals")).toBeDefined();
    });

    expect(
      screen.getByLabelText("Filter by execution status")
    ).toBeDefined();
  });

  it("displays signal count", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mockSignalsResponse);

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("2 signals")).toBeDefined();
    });
  });
});
