import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  const MockChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-bar-chart">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    BarChart: MockChart,
    Bar: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-bar">{children}</div>
    ),
    Cell: () => <div data-testid="recharts-cell" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

import DailyPnlChart from "../DailyPnlChart";
import type { DailyPnlPoint } from "../DailyPnlChart";

afterEach(cleanup);

const sampleData: DailyPnlPoint[] = [
  { date: "2026-03-01", daily_pnl: 50 },
  { date: "2026-03-02", daily_pnl: -30 },
  { date: "2026-03-03", daily_pnl: 75 },
];

describe("DailyPnlChart", () => {
  it("renders empty state when data is empty", () => {
    render(<DailyPnlChart data={[]} />);
    expect(screen.getByText("No PnL data available")).toBeDefined();
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe("Daily PnL chart");
  });

  it("renders chart with valid data", () => {
    render(<DailyPnlChart data={sampleData} />);
    expect(screen.getByTestId("daily-pnl-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
  });

  it("renders a Cell for each data point", () => {
    render(<DailyPnlChart data={sampleData} />);
    const cells = screen.getAllByTestId("recharts-cell");
    expect(cells.length).toBe(3);
  });

  it("has proper aria attributes", () => {
    render(<DailyPnlChart data={sampleData} />);
    const chart = screen.getByTestId("daily-pnl-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Daily PnL chart");
  });

  it("handles single data point", () => {
    const single: DailyPnlPoint[] = [{ date: "2026-03-01", daily_pnl: -10 }];
    render(<DailyPnlChart data={single} />);
    expect(screen.getByTestId("daily-pnl-chart")).toBeDefined();
    expect(screen.getAllByTestId("recharts-cell").length).toBe(1);
  });
});
