/**
 * Cross-page error handling and fallback UI tests.
 *
 * Tests error state transitions, retry behavior, warning banners,
 * and non-Error rejection handling across multiple Dashboard pages.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

/* ------------------------------------------------------------------ */
/* Common mocks                                                        */
/* ------------------------------------------------------------------ */

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => <div data-testid="dynamic-chart" />;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

vi.mock("@/lib/chartUtils", () => ({
  fillEquityCurveGaps: vi.fn((data: unknown[]) => data),
  fillStrategyPnlGaps: vi.fn((data: unknown[]) => data),
}));

/* ------------------------------------------------------------------ */
/* MDSE Page tests                                                     */
/* ------------------------------------------------------------------ */

vi.mock("@/components/mdse/MdseOverview", () => ({
  default: ({ detectors }: { detectors: unknown[] }) => (
    <div data-testid="mdse-overview">{detectors.length} detectors</div>
  ),
}));

vi.mock("@/components/mdse/MdseDetectorTimeline", () => ({
  default: ({ timeline }: { timeline: unknown }) => (
    <div data-testid="mdse-timeline">
      {timeline ? "Timeline loaded" : "No timeline"}
    </div>
  ),
}));

vi.mock("@/components/mdse/MdseEvents", () => ({
  default: ({ events }: { events: unknown[] }) => (
    <div data-testid="mdse-events">{events.length} events</div>
  ),
}));

vi.mock("@/components/mdse/MdseTrades", () => ({
  default: ({ trades }: { trades: unknown[] }) => (
    <div data-testid="mdse-trades">{trades.length} trades</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  fetchMdseSummary: vi.fn(),
  fetchMdseEvents: vi.fn(),
  fetchMdseTrades: vi.fn(),
  fetchMdseTimeline: vi.fn(),
  fetchPortfolioState: vi.fn(),
  fetchEquityCurve: vi.fn(),
  fetchStrategyPerformance: vi.fn(),
  fetchSignals: vi.fn(),
}));

import MdsePage from "../mdse/page";
import PortfolioPage from "../portfolio/page";
import SignalsPage from "../signals/page";
import {
  fetchMdseSummary,
  fetchMdseEvents,
  fetchMdseTrades,
  fetchMdseTimeline,
  fetchPortfolioState,
  fetchEquityCurve,
  fetchStrategyPerformance,
  fetchSignals,
} from "@/lib/api";

const mockMdseSummary = {
  total_events: 15,
  validated_events: 10,
  unvalidated_events: 5,
  daily_event_trend: [],
  weekly_event_trend: [],
  detector_hit_rate_trend: [],
  confidence_distribution: [],
  detectors: [
    {
      detector_name: "fr_extreme",
      event_count: 15,
      validated_count: 10,
      win_rate: 0.67,
      avg_pnl: 5.2,
      weight: 1.0,
      sample_count: 10,
      last_event_at: "2026-03-15T10:00:00",
    },
  ],
};

const mockMdseEvents = [
  {
    id: 1,
    detector_name: "fr_extreme",
    symbol: "BTC/USDT",
    direction: "long",
    confidence: 0.85,
    timestamp: "2026-03-15T10:00:00",
    ttl: 600,
    validated: 0,
    alert_sent: false,
    detector: "fr_extreme",
  },
];

const mockMdseTrades = [
  {
    id: 1,
    event_id: 1,
    symbol: "BTC/USDT",
    direction: "long",
    entry_price: 70000,
    exit_price: 71000,
    entry_time: "2026-03-15T10:00:00",
    exit_time: "2026-03-15T11:00:00",
    position_size: 0.01,
  },
];

const mockMdseTimeline = {
  prices: [{ timestamp: "2026-03-15T10:00:00", price: 70000 }],
  events: [],
};

const mockPortfolio = {
  data: {
    total_balance: 5000,
    last_updated: "2026-03-15T10:00:00",
    strategies: {
      btc_momentum: {
        symbol: "BTC/USDT",
        strategy: "momentum",
        allocation_pct: 40,
        equity: 2000,
        initial_equity: 1800,
        position_count: 3,
        last_signal_time: null,
      },
    },
  },
};

const mockEquityCurve = {
  data: [{ date: "2026-03-15", balance: 5000, daily_pnl: 100, cumulative_pnl: 0 }],
  total_days: 1,
  start_date: "2026-03-15",
  end_date: "2026-03-15",
  initial_balance: 5000,
};

const mockStrategyPerf = [
  {
    strategy: "momentum",
    trade_count: 10,
    win_rate: 0.6,
    profit_factor: 1.5,
    sharpe: 1.2,
    avg_pnl: 5.0,
    max_dd: 50,
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

/* ------------------------------------------------------------------ */
/* MDSE — Retry button recovery                                        */
/* ------------------------------------------------------------------ */

describe("MDSE Page — Retry button recovery", () => {
  it("recovers data after clicking Retry on full failure", async () => {
    // First load: all fail
    vi.mocked(fetchMdseSummary).mockRejectedValueOnce(new Error("fail"));
    vi.mocked(fetchMdseEvents).mockRejectedValueOnce(new Error("fail"));
    vi.mocked(fetchMdseTrades).mockRejectedValueOnce(new Error("fail"));
    vi.mocked(fetchMdseTimeline).mockRejectedValueOnce(new Error("fail"));

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText(/Failed to load MDSE data/)).toBeDefined();

    // Setup success for retry
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockMdseSummary);
    vi.mocked(fetchMdseEvents).mockResolvedValue(mockMdseEvents);
    vi.mocked(fetchMdseTrades).mockResolvedValue(mockMdseTrades);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockMdseTimeline);

    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByTestId("mdse-overview")).toBeDefined();
    });

    expect(screen.getByText("1 detectors")).toBeDefined();
    expect(screen.getByText("1 events")).toBeDefined();
    expect(screen.getByText("1 trades")).toBeDefined();
    expect(screen.getByText("Timeline loaded")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* MDSE — Warning banner section names                                 */
/* ------------------------------------------------------------------ */

describe("MDSE Page — warning banner section names", () => {
  it("lists 'trades' and 'timeline chart' in warning when those sections fail", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockMdseSummary);
    vi.mocked(fetchMdseEvents).mockResolvedValue(mockMdseEvents);
    vi.mocked(fetchMdseTrades).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseTimeline).mockRejectedValue(new Error("fail"));

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    const warningText = screen.getByRole("status").textContent!;
    expect(warningText).toContain("trades");
    expect(warningText).toContain("timeline chart");
  });

  it("lists 'detector summary' when summary fails alone", async () => {
    vi.mocked(fetchMdseSummary).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseEvents).mockResolvedValue(mockMdseEvents);
    vi.mocked(fetchMdseTrades).mockResolvedValue(mockMdseTrades);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockMdseTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByRole("status").textContent).toContain("detector summary");
  });

  it("lists 'recent events' when events fail alone", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockMdseSummary);
    vi.mocked(fetchMdseEvents).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseTrades).mockResolvedValue(mockMdseTrades);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockMdseTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByRole("status").textContent).toContain("recent events");
  });
});

/* ------------------------------------------------------------------ */
/* MDSE — critical failure threshold                                   */
/* ------------------------------------------------------------------ */

describe("MDSE Page — critical failure threshold", () => {
  it("shows warning (not error) when only 2 critical sections fail", async () => {
    // summary + events fail = 2 critical, trades OK = not >= 3
    vi.mocked(fetchMdseSummary).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseEvents).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseTrades).mockResolvedValue(mockMdseTrades);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockMdseTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    // Warning, not full error
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("mdse-trades")).toBeDefined();
  });

  it("shows full error when 3 critical sections fail (even if timeline OK)", async () => {
    vi.mocked(fetchMdseSummary).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseEvents).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseTrades).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockMdseTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText(/Failed to load MDSE data/)).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Portfolio — warning banner section names                            */
/* ------------------------------------------------------------------ */

describe("Portfolio Page — warning section names", () => {
  it("lists 'daily PnL chart' when equity curve fails", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByRole("status").textContent).toContain("daily PnL chart");
  });

  it("lists 'strategy performance' when strategy perf fails", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByRole("status").textContent).toContain("strategy performance");
  });

  it("lists both sections when both secondary APIs fail", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    const text = screen.getByRole("status").textContent!;
    expect(text).toContain("daily PnL chart");
    expect(text).toContain("strategy performance");
  });

  it("shows no warning when all APIs succeed", async () => {
    vi.mocked(fetchPortfolioState).mockResolvedValue(mockPortfolio);
    vi.mocked(fetchEquityCurve).mockResolvedValue(mockEquityCurve);
    vi.mocked(fetchStrategyPerformance).mockResolvedValue(mockStrategyPerf);

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByText("Portfolio")).toBeDefined();
    });

    expect(screen.queryByRole("status")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Portfolio — error message propagation                               */
/* ------------------------------------------------------------------ */

describe("Portfolio Page — error message propagation", () => {
  it("shows the actual error message from rejected promise", async () => {
    vi.mocked(fetchPortfolioState).mockRejectedValue(
      new Error("API error: 500 Internal Server Error")
    );
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(
      screen.getByText("API error: 500 Internal Server Error")
    ).toBeDefined();
  });

  it("shows fallback message for non-Error rejections", async () => {
    vi.mocked(fetchPortfolioState).mockRejectedValue({ code: "ECONNREFUSED" });
    vi.mocked(fetchEquityCurve).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchStrategyPerformance).mockRejectedValue(new Error("fail"));

    render(<PortfolioPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Failed to load portfolio state")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Signals — error state details                                       */
/* ------------------------------------------------------------------ */

describe("Signals Page — error state details", () => {
  it("shows the error message content from the API error", async () => {
    vi.mocked(fetchSignals).mockRejectedValue(
      new Error("API error: 503 Service Unavailable")
    );

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(
      screen.getByText(/API error: 503 Service Unavailable/)
    ).toBeDefined();
  });

  it("handles non-Error rejection gracefully (no crash)", async () => {
    vi.mocked(fetchSignals).mockRejectedValue("string error");

    render(<SignalsPage />);

    // Non-Error: e.message is undefined → page renders with empty data
    await waitFor(() => {
      expect(screen.getByText("No signals found")).toBeDefined();
    });
  });

  it("shows error and still renders header after API failure", async () => {
    vi.mocked(fetchSignals).mockRejectedValue(
      new Error("Request timed out (5s)")
    );

    render(<SignalsPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    // Page still renders the header and table structure
    expect(screen.getByText("Signals")).toBeDefined();
    expect(screen.getByText(/Data unavailable/)).toBeDefined();
  });
});
