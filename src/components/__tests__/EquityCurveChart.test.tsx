import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  const MockChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-area-chart">{children}</div>
  );

  return {
    ResponsiveContainer: MockContainer,
    AreaChart: MockChart,
    Area: () => <div data-testid="recharts-area" />,
    CartesianGrid: () => null,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

import EquityCurveChart from "../EquityCurveChart";
import type { EquityCurvePoint } from "@/types";

afterEach(cleanup);

const sampleData: EquityCurvePoint[] = [
  { date: "2026-03-01", balance: 1000, daily_pnl: 20, cumulative_pnl: 20 },
  { date: "2026-03-02", balance: 1045, daily_pnl: 45, cumulative_pnl: 65 },
  { date: "2026-03-03", balance: 1015, daily_pnl: -30, cumulative_pnl: 35 },
];

describe("EquityCurveChart", () => {
  it("renders empty state when data is empty", () => {
    render(<EquityCurveChart data={[]} />);

    expect(screen.getByText("No equity data available")).toBeDefined();
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe("Equity curve chart");
  });

  it("renders chart with valid data", () => {
    render(<EquityCurveChart data={sampleData} />);

    expect(screen.getByTestId("equity-curve-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
    expect(screen.getByTestId("recharts-area-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-area")).toBeDefined();
  });

  it("has proper aria attributes on the chart container", () => {
    render(<EquityCurveChart data={sampleData} />);

    const chart = screen.getByTestId("equity-curve-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Equity curve chart");
  });

  it("handles a single data point", () => {
    render(<EquityCurveChart data={[sampleData[0]]} />);

    expect(screen.getByTestId("equity-curve-chart")).toBeDefined();
  });

  it("renders negative cumulative pnl data", () => {
    const lossData: EquityCurvePoint[] = [
      { date: "2026-03-01", balance: 980, daily_pnl: -20, cumulative_pnl: -20 },
      { date: "2026-03-02", balance: 950, daily_pnl: -30, cumulative_pnl: -50 },
    ];

    render(<EquityCurveChart data={lossData} />);

    expect(screen.getByTestId("equity-curve-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-area")).toBeDefined();
  });
});
