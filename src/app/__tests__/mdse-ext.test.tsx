import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

const { timeRangeState, eventsSpy } = vi.hoisted(() => ({
  timeRangeState: {
    start: "2026-03-10T00:00:00.000Z",
    end: "2026-03-17T00:00:00.000Z",
  },
  eventsSpy: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/mdse",
}));

vi.mock("@/lib/api", () => ({
  fetchMdseSummary: vi.fn(),
  fetchMdseEvents: vi.fn(),
  fetchMdseTrades: vi.fn(),
  fetchMdseTimeline: vi.fn(),
}));

vi.mock("@/components/TimeRangeFilter", () => ({
  __esModule: true,
  default: () => <div data-testid="time-range-filter" />,
  useTimeRange: () => ({
    range: "7d",
    start: timeRangeState.start,
    end: timeRangeState.end,
  }),
}));

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
  default: ({
    events,
    currentPage,
    hasNextPage,
    onPageChange,
    pageLoading,
  }: {
    events: unknown[];
    currentPage: number;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    pageLoading: boolean;
  }) => {
    eventsSpy({ events, currentPage, hasNextPage, pageLoading });
    return (
      <div data-testid="mdse-events">
        {events.length} events (page {currentPage})
        {hasNextPage && (
          <button data-testid="next-page" onClick={() => onPageChange(currentPage + 1)}>
            Next
          </button>
        )}
        {currentPage > 1 && (
          <button data-testid="prev-page" onClick={() => onPageChange(currentPage - 1)}>
            Prev
          </button>
        )}
        {pageLoading && <span data-testid="page-loading">Loading...</span>}
      </div>
    );
  },
}));

vi.mock("@/components/mdse/MdseTrades", () => ({
  default: ({ trades }: { trades: unknown[] }) => (
    <div data-testid="mdse-trades">{trades.length} trades</div>
  ),
}));

import MdsePage from "../mdse/page";
import {
  fetchMdseSummary,
  fetchMdseEvents,
  fetchMdseTrades,
  fetchMdseTimeline,
} from "@/lib/api";

const mockSummary = {
  total_events: 10,
  validated_events: 5,
  unvalidated_events: 5,
  detectors: [
    {
      detector_name: "fr_extreme",
      event_count: 10,
      validated_count: 5,
      win_rate: 0.6,
      avg_pnl: 3.0,
      weight: 1.0,
      sample_count: 5,
      last_event_at: "2026-03-15T10:00:00",
    },
  ],
  daily_event_trend: [],
  weekly_event_trend: [],
  detector_hit_rate_trend: [],
  confidence_distribution: [],
};

const mockEvent = {
  id: 1,
  detector_name: "fr_extreme",
  symbol: "BTC/USDT",
  direction: "long",
  confidence: 0.85,
  ttl: 600,
  validated: 1,
  alert_sent: false,
  detector: "fr_extreme",
  timestamp: "2026-03-15T10:00:00",
};

const mockTrade = {
  id: 1,
  event_id: 1,
  symbol: "BTC/USDT",
  direction: "long",
  entry_price: 70000,
  exit_price: 71000,
  entry_time: "2026-03-15T10:00:00",
  exit_time: "2026-03-15T11:00:00",
  position_size: 0.01,
};

const mockTimeline = {
  prices: [{ timestamp: "2026-03-15T10:00:00", price: 70000 }],
  events: [mockEvent],
};

function setupSuccess() {
  vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
  vi.mocked(fetchMdseEvents).mockResolvedValue([mockEvent]);
  vi.mocked(fetchMdseTrades).mockResolvedValue([mockTrade]);
  vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);
}

function setupAllFail() {
  vi.mocked(fetchMdseSummary).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMdseEvents).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMdseTrades).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMdseTimeline).mockRejectedValue(new Error("fail"));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  timeRangeState.start = "2026-03-10T00:00:00.000Z";
  timeRangeState.end = "2026-03-17T00:00:00.000Z";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("MDSE Page — extended", () => {
  it("retry button reloads data after error", async () => {
    setupAllFail();

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText("Retry")).toBeDefined();

    // Now setup success and click retry
    setupSuccess();
    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByTestId("mdse-overview")).toBeDefined();
    });

    expect(screen.getByText("1 detectors")).toBeDefined();
    expect(screen.getByText(/1 events/)).toBeDefined();
  });

  it("shows events pagination with hasNextPage when 50 events returned", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
    // Return exactly 50 events to trigger hasNextPage
    const fiftyEvents = Array.from({ length: 50 }, (_, i) => ({
      ...mockEvent,
      id: i + 1,
    }));
    vi.mocked(fetchMdseEvents).mockResolvedValue(fiftyEvents);
    vi.mocked(fetchMdseTrades).mockResolvedValue([mockTrade]);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("mdse-events")).toBeDefined();
    });

    expect(screen.getByText("50 events (page 1)")).toBeDefined();
    expect(screen.getByTestId("next-page")).toBeDefined();
  });

  it("navigates to next page of events", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
    const fiftyEvents = Array.from({ length: 50 }, (_, i) => ({
      ...mockEvent,
      id: i + 1,
    }));
    vi.mocked(fetchMdseEvents).mockResolvedValue(fiftyEvents);
    vi.mocked(fetchMdseTrades).mockResolvedValue([mockTrade]);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("next-page")).toBeDefined();
    });

    // Setup page 2 response (fewer than 50 = no next page)
    const page2Events = Array.from({ length: 10 }, (_, i) => ({
      ...mockEvent,
      id: i + 51,
    }));
    vi.mocked(fetchMdseEvents).mockResolvedValue(page2Events);

    fireEvent.click(screen.getByTestId("next-page"));

    await waitFor(() => {
      expect(screen.getByText("10 events (page 2)")).toBeDefined();
    });

    expect(screen.queryByTestId("next-page")).toBeNull();
  });

  it("shows no hasNextPage when fewer than 50 events returned", async () => {
    setupSuccess(); // returns 1 event

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("mdse-events")).toBeDefined();
    });

    expect(screen.getByText("1 events (page 1)")).toBeDefined();
    expect(screen.queryByTestId("next-page")).toBeNull();
  });

  it("keeps current page on events page fetch error", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
    const fiftyEvents = Array.from({ length: 50 }, (_, i) => ({
      ...mockEvent,
      id: i + 1,
    }));
    vi.mocked(fetchMdseEvents).mockResolvedValue(fiftyEvents);
    vi.mocked(fetchMdseTrades).mockResolvedValue([mockTrade]);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("next-page")).toBeDefined();
    });

    // Page 2 fetch will fail
    vi.mocked(fetchMdseEvents).mockRejectedValue(new Error("page fail"));

    fireEvent.click(screen.getByTestId("next-page"));

    // Should stay on page 1 after error
    await waitFor(() => {
      expect(screen.getByText("50 events (page 1)")).toBeDefined();
    });
  });

  it("shows only timeline-failed warning (not critical) when timeline alone fails", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
    vi.mocked(fetchMdseEvents).mockResolvedValue([mockEvent]);
    vi.mocked(fetchMdseTrades).mockResolvedValue([mockTrade]);
    vi.mocked(fetchMdseTimeline).mockRejectedValue(new Error("timeline fail"));

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(screen.getByText(/timeline chart/)).toBeDefined();
    // Not a critical error — data still shows
    expect(screen.getByText("1 detectors")).toBeDefined();
    expect(screen.getByText(/1 events/)).toBeDefined();
    expect(screen.getByText("No timeline")).toBeDefined();
  });

  it("renders all zero data when all APIs return empty arrays", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue({
      ...mockSummary,
      detectors: [],
    });
    vi.mocked(fetchMdseEvents).mockResolvedValue([]);
    vi.mocked(fetchMdseTrades).mockResolvedValue([]);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("mdse-overview")).toBeDefined();
    });

    expect(screen.getByText("0 detectors")).toBeDefined();
    expect(screen.getByText("0 events (page 1)")).toBeDefined();
    expect(screen.getByText("0 trades")).toBeDefined();
  });
});
