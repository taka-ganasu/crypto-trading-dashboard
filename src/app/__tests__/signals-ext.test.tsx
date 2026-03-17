import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/signals",
}));

vi.mock("@/lib/api", () => ({
  fetchSignals: vi.fn(),
}));

vi.mock("@/components/DetailPanel", () => ({
  default: ({
    isOpen,
    children,
    onClose,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="detail-panel">
        <button data-testid="close-panel" onClick={onClose}>
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

import SignalsPage from "../signals/page";
import { fetchSignals } from "@/lib/api";

const twoPageResponse = {
  signals: Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    timestamp: "2026-03-15T10:00:00",
    symbol: "BTC/USDT",
    action: i % 2 === 0 ? "buy" : "sell",
    score: 0.85,
    confidence: 72.5,
    executed: i % 3 === 0 ? 1 : 0,
    skip_reason: i % 3 === 0 ? null : "confidence_below_threshold",
    strategy_type: "momentum",
    cycle_id: 10,
    created_at: "2026-03-15T10:00:00",
  })),
  total: 50,
  offset: 0,
  limit: 25,
};

const mixedSignals = {
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
      skip_reason: "low_confidence",
      strategy_type: "fr_reversal",
      cycle_id: 11,
      created_at: "2026-03-15T11:00:00",
    },
    {
      id: 3,
      timestamp: "2026-03-15T12:00:00",
      symbol: "SOL/USDT",
      action: "hold",
      score: null,
      confidence: null,
      executed: 0,
      skip_reason: null,
      strategy_type: null,
      cycle_id: null,
      created_at: "2026-03-15T12:00:00",
    },
  ],
  total: 3,
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

describe("Signals Page — extended", () => {
  it("shows pagination controls when total > PAGE_SIZE", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(twoPageResponse);
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeDefined();
    });

    expect(screen.getByText("Prev")).toBeDefined();
    expect(screen.getByText("Next")).toBeDefined();
  });

  it("clicking Next calls fetchSignals again", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(twoPageResponse);
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeDefined();
    });

    const callsBefore = vi.mocked(fetchSignals).mock.calls.length;
    fireEvent.click(screen.getByText("Next"));

    // The click triggers a re-render with setCurrentPage → useEffect fetches again
    await waitFor(() => {
      expect(vi.mocked(fetchSignals).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it("filters by executed status", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mixedSignals);
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    const select = screen.getByLabelText("Filter by execution status");
    fireEvent.change(select, { target: { value: "not_executed" } });

    await waitFor(() => {
      // Refetch is triggered; not_executed filter applies client-side
      expect(screen.getByText("ETH/USDT")).toBeDefined();
    });
  });

  it("opens signal detail panel on row click", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mixedSignals);
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    // Click the BTC row
    fireEvent.click(screen.getByText("BTC/USDT"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    // Detail rows should include signal info
    const rows = screen.getAllByTestId("detail-row");
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("closes detail panel", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mixedSignals);
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    fireEvent.click(screen.getByText("BTC/USDT"));
    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("close-panel"));
    await waitFor(() => {
      expect(screen.queryByTestId("detail-panel")).toBeNull();
    });
  });

  it("shows hold action with neutral badge", async () => {
    vi.mocked(fetchSignals).mockResolvedValue(mixedSignals);
    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("HOLD")).toBeDefined();
    });
  });
});
