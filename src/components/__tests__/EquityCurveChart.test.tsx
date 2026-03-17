import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

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
    Area: ({ stroke }: { stroke?: string }) => (
      <div data-testid="recharts-area" data-stroke={stroke} />
    ),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

import EquityCurveChart from "../EquityCurveChart";
import type { EquityCurvePoint } from "../EquityCurveChart";

afterEach(cleanup);

const profitData: EquityCurvePoint[] = [
  { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
  { date: "2026-03-02", balance: 1050, daily_pnl: 50, cumulative_pnl: 50 },
  { date: "2026-03-03", balance: 1100, daily_pnl: 50, cumulative_pnl: 100 },
];

const lossData: EquityCurvePoint[] = [
  { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
  { date: "2026-03-02", balance: 950, daily_pnl: -50, cumulative_pnl: -50 },
];

describe("EquityCurveChart", () => {
  it("renders empty state when data is empty", () => {
    render(<EquityCurveChart data={[]} />);
    expect(screen.getByText("No equity data available")).toBeDefined();
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe("Equity curve chart");
  });

  it("renders chart with profit data", () => {
    render(<EquityCurveChart data={profitData} />);
    expect(screen.getByTestId("equity-curve-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
  });

  it("uses green stroke for profitable data", () => {
    render(<EquityCurveChart data={profitData} />);
    const area = screen.getByTestId("recharts-area");
    expect(area.getAttribute("data-stroke")).toBe("#34d399");
  });

  it("uses red stroke for loss data", () => {
    render(<EquityCurveChart data={lossData} />);
    const area = screen.getByTestId("recharts-area");
    expect(area.getAttribute("data-stroke")).toBe("#f87171");
  });

  it("has proper aria attributes", () => {
    render(<EquityCurveChart data={profitData} />);
    const chart = screen.getByTestId("equity-curve-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Equity curve chart");
  });

  it("handles single data point", () => {
    const single: EquityCurvePoint[] = [
      { date: "2026-03-01", balance: 500, daily_pnl: -10, cumulative_pnl: -10 },
    ];
    render(<EquityCurveChart data={single} />);
    expect(screen.getByTestId("equity-curve-chart")).toBeDefined();
  });
});
