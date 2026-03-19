import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/mdse",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchMdseSummary: vi.fn(),
  fetchMdseEvents: vi.fn(),
  fetchMdseTrades: vi.fn(),
  fetchMdseTimeline: vi.fn(),
}));

// Mock child components
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

import MdsePage from "../mdse/page";
import {
  fetchMdseSummary,
  fetchMdseEvents,
  fetchMdseTrades,
  fetchMdseTimeline,
} from "@/lib/api";
import type { MdseEvent, MdseSummary, MdseTimeline, MdseTrade } from "@/types";

const mockSummary = {
  total_events: 23,
  validated_events: 15,
  unvalidated_events: 8,
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
    {
      detector_name: "oi_divergence",
      event_count: 8,
      validated_count: 5,
      win_rate: 0.6,
      avg_pnl: 3.1,
      weight: 0.8,
      sample_count: 5,
      last_event_at: "2026-03-15T09:00:00",
    },
  ],
  daily_event_trend: [],
  weekly_event_trend: [],
  detector_hit_rate_trend: [],
  confidence_distribution: [],
} satisfies MdseSummary;

const mockEvents = [
  {
    id: 1,
    detector: "fr_extreme",
    detector_name: "fr_extreme",
    symbol: "BTC/USDT",
    direction: "long",
    confidence: 0.85,
    timestamp: "2026-03-15T10:00:00",
    ttl: 600,
    validated: 1,
    alert_sent: true,
  },
] satisfies MdseEvent[];

const mockTrades = [
  {
    id: 1,
    event_id: 1,
    symbol: "BTC/USDT",
    direction: "long",
    entry_price: 70000,
    exit_price: 71000,
    entry_time: "2026-03-15T10:00:00",
    exit_time: "2026-03-15T11:00:00",
    position_size: 0.1,
  },
] satisfies MdseTrade[];

const mockTimeline = {
  prices: [{ timestamp: "2026-03-15T10:00:00", price: 70000 }],
  events: mockEvents,
} satisfies MdseTimeline;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setupMocksSuccess() {
  vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
  vi.mocked(fetchMdseEvents).mockResolvedValue(mockEvents);
  vi.mocked(fetchMdseTrades).mockResolvedValue(mockTrades);
  vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);
}

function setupMocksAllFail() {
  vi.mocked(fetchMdseSummary).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMdseEvents).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMdseTrades).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchMdseTimeline).mockRejectedValue(new Error("fail"));
}

describe("MDSE Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchMdseSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchMdseEvents).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchMdseTrades).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchMdseTimeline).mockReturnValue(new Promise(() => {}));

    render(<MdsePage />);
    expect(screen.getByText("Loading MDSE data...")).toBeDefined();
  });

  it("shows error state when all APIs fail", async () => {
    setupMocksAllFail();

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });

    expect(screen.getByText(/Failed to load MDSE data/)).toBeDefined();
    expect(screen.getByText("Retry")).toBeDefined();
  });

  it("shows MDSE data on success", async () => {
    setupMocksSuccess();

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("mdse-overview")).toBeDefined();
    });

    expect(screen.getByText("2 detectors")).toBeDefined();
    expect(screen.getByText("1 events")).toBeDefined();
    expect(screen.getByText("1 trades")).toBeDefined();
    expect(screen.getByText("Timeline loaded")).toBeDefined();
  });

  it("shows warning when some APIs fail but data exists", async () => {
    vi.mocked(fetchMdseSummary).mockResolvedValue(mockSummary);
    vi.mocked(fetchMdseEvents).mockResolvedValue(mockEvents);
    vi.mocked(fetchMdseTrades).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseTimeline).mockRejectedValue(new Error("fail"));

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });

    expect(
      screen.getByText(/Some sections failed to load/)
    ).toBeDefined();

    // Data still shows
    expect(screen.getByText("2 detectors")).toBeDefined();
    expect(screen.getByText("1 events")).toBeDefined();
  });

  it("shows empty detectors when summary fails alone", async () => {
    vi.mocked(fetchMdseSummary).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchMdseEvents).mockResolvedValue(mockEvents);
    vi.mocked(fetchMdseTrades).mockResolvedValue(mockTrades);
    vi.mocked(fetchMdseTimeline).mockResolvedValue(mockTimeline);

    render(<MdsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("mdse-overview")).toBeDefined();
    });

    // Summary failed → 0 detectors
    expect(screen.getByText("0 detectors")).toBeDefined();
    // Other data still loaded
    expect(screen.getByText("1 events")).toBeDefined();
    expect(screen.getByText("1 trades")).toBeDefined();
  });
});
