import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { MdseTimeline } from "@/types";

const { formatPriceMock, tooltipState } = vi.hoisted(() => ({
  formatPriceMock: vi.fn((value: number) => `formatted:${value}`),
  tooltipState: {
    active: false as boolean,
    payload: undefined as Array<{ payload: { time: number; timestamp: string; price: number; symbol: string } }> | undefined,
  },
}));

vi.mock("@/lib/format", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/format")>();
  return {
    ...actual,
    formatPrice: formatPriceMock,
  };
});

vi.mock("recharts", () => {
  const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  const LineChart = ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: Array<unknown>;
  }) => (
    <div data-testid="recharts-line-chart" data-points={String(data.length)}>
      {children}
    </div>
  );
  const Line = ({
    stroke,
    activeDot,
  }: {
    stroke?: string;
    activeDot?: { fill?: string };
  }) => (
    <div
      data-testid="recharts-line"
      data-stroke={stroke ?? ""}
      data-active-dot-fill={activeDot?.fill ?? ""}
    />
  );
  const XAxis = ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="recharts-x-axis">
      {tickFormatter ? tickFormatter(Date.parse("2026-03-01T00:00:00Z")) : ""}
    </div>
  );
  const YAxis = ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="recharts-y-axis">{tickFormatter ? tickFormatter(1234.56) : ""}</div>
  );
  const Tooltip = ({ content }: { content?: React.ReactElement }) => (
    <div data-testid="recharts-tooltip">
      {React.isValidElement(content)
        ? React.cloneElement(content, tooltipState)
        : null}
    </div>
  );
  const ReferenceDot = ({
    x,
    y,
    shape,
  }: {
    x: number;
    y: number;
    shape?: (props: Record<string, number>) => React.ReactNode;
  }) => (
    <div data-testid="recharts-reference-dot" data-x={String(x)} data-y={String(y)}>
      {shape ? shape({ cx: 10, cy: 20 }) : null}
    </div>
  );

  return {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid: () => <div data-testid="recharts-grid" />,
    Tooltip,
    ReferenceDot,
  };
});

import MdseTimelineChart from "../MdseTimelineChart";

const baseTimeline: MdseTimeline = {
  prices: [
    { timestamp: "2026-03-01T01:00:00Z", price: 50100, symbol: "BTC/USDT" },
    { timestamp: "2026-03-01T00:00:00Z", price: 50000, symbol: "BTC/USDT" },
    { timestamp: "2026-03-01T00:00:00Z", price: 3200, symbol: "ETH/USDT" },
    { timestamp: "2026-03-01T01:00:00Z", price: 3210, symbol: "ETH/USDT" },
  ],
  events: [
    {
      id: 1,
      detector_name: "fr_extreme",
      symbol: "BTC/USDT",
      direction: "buy",
      confidence: 0.85,
      timestamp: "2026-03-01T00:30:00Z",
    },
    {
      id: 2,
      detector: "Liq Cascade",
      symbol: "BTC/USDT",
      direction: "short",
      confidence: 0.7,
      timestamp: "2026-03-01T00:45:00Z",
    },
    {
      id: 3,
      symbol: "BTC/USDT",
      direction: "short",
      confidence: 0.2,
      timestamp: "2026-03-01T00:15:00Z",
    } as MdseTimeline["events"][number],
  ],
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  tooltipState.active = false;
  tooltipState.payload = undefined;
});

describe("MdseTimelineChart", () => {
  it("renders the empty state when no timeline data is available", () => {
    render(<MdseTimelineChart data={null} />);
    expect(screen.getByText("No timeline data available")).toBeDefined();
    expect(screen.getByTestId("mdse-timeline-chart")).toBeDefined();
  });

  it("renders chart details, tooltip content, reference dots, and legend entries", () => {
    tooltipState.active = true;
    tooltipState.payload = [
      {
        payload: {
          time: 0,
          timestamp: "not-a-date",
          price: 1234.5,
          symbol: "BTC/USDT",
        },
      },
    ];

    const { container } = render(<MdseTimelineChart data={baseTimeline} />);

    expect(screen.getByTestId("mdse-timeline-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
    expect(screen.getByTestId("recharts-line-chart").dataset.points).toBe("2");
    expect(screen.getByTestId("mdse-symbol-selector")).toBeDefined();
    expect(screen.getByText("BTC/USDT")).toBeDefined();
    expect(screen.getByText("ETH/USDT")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.getByText("formatted:1234.5")).toBeDefined();
    expect(formatPriceMock).toHaveBeenCalledWith(
      1234.56,
      expect.objectContaining({ currency: true })
    );
    expect(formatPriceMock).toHaveBeenCalledWith(
      1234.5,
      expect.objectContaining({ compact: true, compactDecimals: 1 })
    );
    expect(screen.getByTestId("recharts-line").dataset.stroke).toBe("#f59e0b");
    expect(screen.getByTestId("recharts-line").dataset.activeDotFill).toBe("#f59e0b");
    expect(screen.getByTestId("mdse-timeline-legend")).toBeDefined();
    expect(screen.getByText("fr_extreme")).toBeDefined();
    expect(screen.getByText("Liq Cascade")).toBeDefined();
    expect(screen.queryByText("unknown")).toBeNull();
    expect(screen.getAllByTestId("recharts-reference-dot")).toHaveLength(3);
    expect(screen.getByText("L")).toBeDefined();
    expect(screen.getAllByText("S")).toHaveLength(2);
    expect(container.querySelector('circle[fill="#3b82f6"]')).not.toBeNull();
    expect(container.querySelector('circle[fill="#ef4444"]')).not.toBeNull();
    expect(container.querySelector('circle[fill="#71717a"]')).not.toBeNull();
  });

  it("switches the active symbol, updates line styling, and hides the legend when no events match", () => {
    render(<MdseTimelineChart data={baseTimeline} />);

    fireEvent.click(screen.getByText("ETH/USDT"));

    expect(screen.getByText("ETH/USDT").className).toContain("border");
    expect(screen.getByTestId("recharts-line").dataset.stroke).toBe("#6366f1");
    expect(screen.queryByTestId("mdse-timeline-legend")).toBeNull();
    expect(screen.queryAllByTestId("recharts-reference-dot")).toHaveLength(0);
  });

  it("renders the no-price state when prices exist but cannot produce chart data", () => {
    render(
      <MdseTimelineChart
        data={{
          prices: [
            {
              timestamp: "2026-03-01T00:00:00Z",
              price: 50000,
              symbol: null as unknown as string,
            },
          ],
          events: [
            {
              id: 99,
              detector_name: "sentiment_spike",
              symbol: "BTC/USDT",
              direction: "long",
              confidence: 0.5,
              timestamp: "2026-03-01T00:30:00Z",
            },
          ],
        }}
      />
    );

    expect(screen.getByText("No price data for selected symbol")).toBeDefined();
    expect(screen.queryByTestId("recharts-line-chart")).toBeNull();
  });

  it("uses fallback colors and the single-symbol label for unknown symbols", () => {
    render(
      <MdseTimelineChart
        data={{
          prices: [
            { timestamp: "not-a-date", price: 0.11, symbol: "DOGE/USDT" },
            { timestamp: "2026-03-01T00:00:00Z", price: null, symbol: "DOGE/USDT" },
            { timestamp: "2026-03-01T01:00:00Z", price: 0.12, symbol: "DOGE/USDT" },
          ],
          events: [],
        }}
      />
    );

    expect(screen.queryByTestId("mdse-symbol-selector")).toBeNull();
    expect(screen.getByText("Showing:")).toBeDefined();
    expect(screen.getByText("DOGE/USDT")).toBeDefined();
    expect(screen.getByTestId("recharts-line").dataset.stroke).toBe("#a1a1aa");
    expect(screen.getByTestId("recharts-line").dataset.activeDotFill).toBe("#a1a1aa");
  });
});
