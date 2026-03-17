import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { MdseTimeline } from "@/types";

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  const MockChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-line-chart">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    LineChart: MockChart,
    Line: () => <div data-testid="recharts-line" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ReferenceDot: () => null,
  };
});

import MdseTimelineChart from "../MdseTimelineChart";

afterEach(cleanup);

const baseTimeline: MdseTimeline = {
  prices: [
    { timestamp: "2026-03-01T00:00:00Z", price: 50000, symbol: "BTC/USDT" },
    { timestamp: "2026-03-01T01:00:00Z", price: 50100, symbol: "BTC/USDT" },
    { timestamp: "2026-03-01T00:00:00Z", price: 3200, symbol: "ETH/USDT" },
    { timestamp: "2026-03-01T01:00:00Z", price: 3210, symbol: "ETH/USDT" },
  ],
  events: [
    {
      id: 1,
      detector_name: "fr_extreme",
      symbol: "BTC/USDT",
      direction: "long",
      confidence: 0.85,
      timestamp: "2026-03-01T00:30:00Z",
    },
    {
      id: 2,
      detector: "liq_cascade",
      symbol: "ETH/USDT",
      direction: "short",
      confidence: 0.7,
      timestamp: "2026-03-01T00:45:00Z",
    },
  ],
};

describe("MdseTimelineChart", () => {
  it("renders empty state when data is null", () => {
    render(<MdseTimelineChart data={null} />);
    expect(screen.getByText("No timeline data available")).toBeDefined();
    expect(screen.getByTestId("mdse-timeline-chart")).toBeDefined();
  });

  it("renders empty state when prices array is empty", () => {
    render(<MdseTimelineChart data={{ prices: [], events: [] }} />);
    expect(screen.getByText("No timeline data available")).toBeDefined();
  });

  it("renders chart with valid data", () => {
    render(<MdseTimelineChart data={baseTimeline} />);
    expect(screen.getByTestId("mdse-timeline-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
  });

  it("renders symbol selector when multiple symbols", () => {
    render(<MdseTimelineChart data={baseTimeline} />);
    const selector = screen.getByTestId("mdse-symbol-selector");
    expect(selector).toBeDefined();
    expect(screen.getByText("BTC/USDT")).toBeDefined();
    expect(screen.getByText("ETH/USDT")).toBeDefined();
  });

  it("does not render symbol selector with single symbol", () => {
    const singleSymbol: MdseTimeline = {
      prices: [
        { timestamp: "2026-03-01T00:00:00Z", price: 50000, symbol: "BTC/USDT" },
        { timestamp: "2026-03-01T01:00:00Z", price: 50100, symbol: "BTC/USDT" },
      ],
      events: [],
    };
    render(<MdseTimelineChart data={singleSymbol} />);
    expect(screen.queryByTestId("mdse-symbol-selector")).toBeNull();
  });

  it("switches active symbol on button click", () => {
    render(<MdseTimelineChart data={baseTimeline} />);
    const ethButton = screen.getByText("ETH/USDT");
    fireEvent.click(ethButton);
    // After clicking ETH, the ETH button should have active styling (border)
    expect(ethButton.className).toContain("border");
  });

  it("renders detector legend when events exist", () => {
    render(<MdseTimelineChart data={baseTimeline} />);
    const legend = screen.getByTestId("mdse-timeline-legend");
    expect(legend).toBeDefined();
    expect(screen.getByText("fr_extreme")).toBeDefined();
  });

  it("does not render legend when no events", () => {
    const noEvents: MdseTimeline = {
      prices: [
        { timestamp: "2026-03-01T00:00:00Z", price: 50000, symbol: "BTC/USDT" },
        { timestamp: "2026-03-01T01:00:00Z", price: 50100, symbol: "BTC/USDT" },
      ],
      events: [],
    };
    render(<MdseTimelineChart data={noEvents} />);
    expect(screen.queryByTestId("mdse-timeline-legend")).toBeNull();
  });

  it("has proper aria attributes", () => {
    render(<MdseTimelineChart data={baseTimeline} />);
    const chart = screen.getByTestId("mdse-timeline-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Detector timeline chart");
  });

  it("handles prices with null values gracefully", () => {
    const nullPrices: MdseTimeline = {
      prices: [
        { timestamp: "2026-03-01T00:00:00Z", price: null, symbol: "BTC/USDT" },
        { timestamp: "2026-03-01T01:00:00Z", price: 50100, symbol: "BTC/USDT" },
      ],
      events: [],
    };
    render(<MdseTimelineChart data={nullPrices} />);
    // Should still render (null prices are filtered)
    expect(screen.getByTestId("mdse-timeline-chart")).toBeDefined();
  });
});
