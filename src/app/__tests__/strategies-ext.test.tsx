import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/strategies",
}));

vi.mock("@/lib/api", () => ({
  fetchStrategies: vi.fn(),
  fetchStrategyPerformance: vi.fn(),
  fetchSystemStatsOverview: vi.fn(),
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
    <div data-testid={`detail-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      {label}: {value}
    </div>
  ),
}));

import StrategiesPage from "../strategies/page";
import {
  fetchStrategies,
  fetchStrategyPerformance,
  fetchSystemStatsOverview,
} from "@/lib/api";

const mockPerformance = [
  {
    strategy: "BTC Momentum",
    trade_count: 25,
    win_rate: 0.6,
    profit_factor: 1.5,
    sharpe: 1.2,
    avg_pnl: 8.5,
    max_dd: 120,
  },
  {
    strategy: "SOL FR Reversal",
    trade_count: 18,
    win_rate: 0.55,
    profit_factor: 1.3,
    sharpe: 0.9,
    avg_pnl: -2.1,
    max_dd: 80,
  },
];

function setupMocks() {
  vi.mocked(fetchStrategies).mockResolvedValue({ active_plan: "plan_6b", strategies: [] });
  vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockPerformance);
  vi.mocked(fetchSystemStatsOverview).mockResolvedValue({ recent_trades: 55 });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Strategies Page — extended", () => {
  it("opens detail panel on strategy card click", async () => {
    setupMocks();
    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("BTC Momentum")).toHaveLength(2);
    });

    // Click the first BTC Momentum (card)
    const cards = screen.getAllByText("BTC Momentum");
    fireEvent.click(cards[0]);

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    expect(screen.getByTestId("detail-strategy")).toBeDefined();
    expect(screen.getByTestId("detail-trades")).toBeDefined();
  });

  it("closes detail panel", async () => {
    setupMocks();
    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("BTC Momentum")).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByText("BTC Momentum")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("close-panel"));
    await waitFor(() => {
      expect(screen.queryByTestId("detail-panel")).toBeNull();
    });
  });

  it("sorts by win rate on header click", async () => {
    setupMocks();
    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Detail Comparison")).toBeDefined();
    });

    const wrButton = screen.getByLabelText("Win Rate");
    fireEvent.click(wrButton);

    // After first click: desc sort — BTC Momentum (0.6) should be first
    const tableRows = screen.getByLabelText("Strategy comparison table")
      .querySelectorAll("tbody tr");
    expect(tableRows.length).toBe(2);
  });

  it("toggles sort direction on second click", async () => {
    setupMocks();
    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Detail Comparison")).toBeDefined();
    });

    const pfButton = screen.getByLabelText("Profit Factor");
    fireEvent.click(pfButton); // desc
    fireEvent.click(pfButton); // asc

    // Sort indicator should change
    const tableRows = screen.getByLabelText("Strategy comparison table")
      .querySelectorAll("tbody tr");
    expect(tableRows.length).toBe(2);
  });

  it("opens detail panel on table row click", async () => {
    setupMocks();
    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("SOL FR Reversal")).toHaveLength(2);
    });

    // Click the table row (second occurrence)
    const solTexts = screen.getAllByText("SOL FR Reversal");
    fireEvent.click(solTexts[1]);

    await waitFor(() => {
      expect(screen.getByTestId("detail-panel")).toBeDefined();
    });
  });

  it("shows sort indicators on headers", async () => {
    setupMocks();
    render(<StrategiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Detail Comparison")).toBeDefined();
    });

    // Before clicking, all show SORT
    expect(screen.getAllByText("SORT").length).toBe(3); // Win Rate, Profit Factor, Sharpe

    const sharpeButton = screen.getByLabelText("Sharpe");
    fireEvent.click(sharpeButton);

    // After clicking sharpe, it shows DESC
    expect(screen.getByText("DESC")).toBeDefined();
    expect(screen.getAllByText("SORT").length).toBe(2);
  });
});
