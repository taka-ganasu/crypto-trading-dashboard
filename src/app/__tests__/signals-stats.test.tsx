/**
 * Extended Signals page tests — stats computation, action badge
 * CSS classes, executed marks, pagination edge cases, empty stats.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/signals",
}));

vi.mock("@/lib/api", () => ({
  fetchSignals: vi.fn(),
}));

vi.mock("@/components/DetailPanel", () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="detail-panel">{children}</div> : null,
}));

vi.mock("@/components/DetailRow", () => ({
  default: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="detail-row">{label}: {value}</div>
  ),
}));

import SignalsPage from "../signals/page";
import { fetchSignals } from "@/lib/api";

function makeSignal(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    timestamp: "2026-03-15T10:00:00",
    symbol: "BTC/USDT",
    action: "buy",
    score: 0.85,
    confidence: 70.0,
    executed: 1,
    skip_reason: null,
    strategy_type: "momentum",
    cycle_id: 10,
    created_at: "2026-03-15T10:00:00",
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
/* Stats computation                                                   */
/* ------------------------------------------------------------------ */

describe("Signals — stats computation", () => {
  it("computes execution rate correctly", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [
        makeSignal({ id: 1, executed: 1, confidence: 90 }),
        makeSignal({ id: 2, executed: 1, confidence: 80 }),
        makeSignal({ id: 3, executed: 0, confidence: 70 }),
        makeSignal({ id: 4, executed: 0, confidence: 60 }),
      ],
      total: 4,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Signals")).toBeDefined();
    });

    // 2 out of 4 executed = 50.0%
    expect(screen.getByText("50.0%")).toBeDefined();
  });

  it("computes avg confidence correctly", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [
        makeSignal({ id: 1, confidence: 80, executed: 1 }),
        makeSignal({ id: 2, confidence: 60, executed: 0 }),
      ],
      total: 2,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Signals")).toBeDefined();
    });

    // (80 + 60) / 2 = 70.0
    expect(screen.getByText("70.0%")).toBeDefined();
  });

  it("shows 0.0% stats when signals list is empty", async () => {
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

    // Both execution rate and avg confidence should be 0.0%
    const zeros = screen.getAllByText("0.0%");
    expect(zeros.length).toBe(2);
  });

  it("handles null confidence in avg calculation (treated as 0)", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [
        makeSignal({ id: 1, confidence: 80, executed: 1 }),
        makeSignal({ id: 2, confidence: null, executed: 0 }),
      ],
      total: 2,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Signals")).toBeDefined();
    });

    // (80 + 0) / 2 = 40.0%
    expect(screen.getByText("40.0%")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Action badge CSS classes                                            */
/* ------------------------------------------------------------------ */

describe("Signals — action badge styling", () => {
  it("buy action has emerald badge", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, action: "buy" })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("BUY")).toBeDefined();
    });

    expect(screen.getByText("BUY").className).toContain("text-emerald-400");
    expect(screen.getByText("BUY").className).toContain("bg-emerald-900/50");
  });

  it("sell action has red badge", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, action: "sell" })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("SELL")).toBeDefined();
    });

    expect(screen.getByText("SELL").className).toContain("text-red-400");
    expect(screen.getByText("SELL").className).toContain("bg-red-900/50");
  });

  it("hold action has neutral zinc badge", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, action: "hold" })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("HOLD")).toBeDefined();
    });

    expect(screen.getByText("HOLD").className).toContain("text-zinc-400");
    expect(screen.getByText("HOLD").className).toContain("bg-zinc-800");
  });
});

/* ------------------------------------------------------------------ */
/* Executed checkmark vs X                                             */
/* ------------------------------------------------------------------ */

describe("Signals — executed marks", () => {
  it("executed=1 shows checkmark (✓)", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, executed: 1 })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("✓")).toBeDefined();
    });

    expect(screen.getByText("✓").className).toContain("text-emerald-400");
  });

  it("executed=0 shows X mark (✗)", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, executed: 0 })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("✗")).toBeDefined();
    });

    expect(screen.getByText("✗").className).toContain("text-zinc-600");
  });
});

/* ------------------------------------------------------------------ */
/* Skip reason and confidence display                                  */
/* ------------------------------------------------------------------ */

describe("Signals — field display", () => {
  it("skip_reason text is displayed in table", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [
        makeSignal({
          id: 1,
          executed: 0,
          skip_reason: "confidence_below_threshold",
        }),
      ],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("confidence_below_threshold")).toBeDefined();
    });
  });

  it("confidence displays with 1 decimal and % suffix", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, confidence: 85.7 })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      // 85.7% appears in both the stats card (avg confidence) and table cell
      const matches = screen.getAllByText("85.7%");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("score displays with 3 decimal places", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, score: 0.123456 })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("0.123")).toBeDefined();
    });
  });

  it("null strategy_type shows dash", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: [makeSignal({ id: 1, strategy_type: null })],
      total: 1,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("BTC/USDT")).toBeDefined();
    });

    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

/* ------------------------------------------------------------------ */
/* Pagination Prev disabled on first page                              */
/* ------------------------------------------------------------------ */

describe("Signals — pagination Prev disabled", () => {
  it("Prev button is disabled on page 1", async () => {
    vi.mocked(fetchSignals).mockResolvedValue({
      signals: Array.from({ length: 25 }, (_, i) => makeSignal({ id: i + 1 })),
      total: 50,
      offset: 0,
      limit: 25,
    });

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeDefined();
    });

    const prevBtn = screen.getByText("Prev") as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });
});
