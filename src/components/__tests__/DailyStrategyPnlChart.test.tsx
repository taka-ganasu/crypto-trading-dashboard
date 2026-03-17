import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import type { TradeByStrategyDaily } from "@/types";

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  const MockChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  );
  const MockBar = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="recharts-bar">{children}</div>
  );

  return {
    ResponsiveContainer: MockContainer,
    BarChart: MockChart,
    Bar: MockBar,
    CartesianGrid: () => null,
    Legend: () => <div data-testid="recharts-legend" />,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

import DailyStrategyPnlChart from "../DailyStrategyPnlChart";

afterEach(cleanup);

const sampleData: TradeByStrategyDaily[] = [
  { date: "2026-03-01", strategy: "momentum", trade_count: 2, daily_pnl: 120 },
  { date: "2026-03-01", strategy: "mean_reversion", trade_count: 1, daily_pnl: -45 },
  { date: "2026-03-02", strategy: "momentum", trade_count: 3, daily_pnl: 80 },
];

describe("DailyStrategyPnlChart", () => {
  it("renders empty state when data is empty", () => {
    render(<DailyStrategyPnlChart data={[]} />);

    expect(screen.getByText("No trade data yet")).toBeDefined();
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe("Daily strategy pnl chart");
  });

  it("renders chart with valid data", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    expect(screen.getByTestId("daily-strategy-pnl-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
    expect(screen.getByTestId("recharts-bar-chart")).toBeDefined();
  });

  it("renders one stacked bar series per unique strategy", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    expect(screen.getAllByTestId("recharts-bar")).toHaveLength(2);
  });

  it("falls back to unknown for blank strategy names", () => {
    const blankStrategyData: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "", trade_count: 1, daily_pnl: 25 },
    ];

    render(<DailyStrategyPnlChart data={blankStrategyData} />);

    expect(screen.getByTestId("daily-strategy-pnl-chart")).toBeDefined();
    expect(screen.getAllByTestId("recharts-bar")).toHaveLength(1);
  });

  it("has proper aria attributes on the chart container", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    const chart = screen.getByTestId("daily-strategy-pnl-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Daily strategy pnl chart");
  });
});
