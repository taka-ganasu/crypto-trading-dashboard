import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ReferenceLine: () => null,
  };
});

import CumulativePnlChart from "../CumulativePnlChart";
import type { CumulativePnlPoint } from "../CumulativePnlChart";

afterEach(cleanup);

const sampleData: CumulativePnlPoint[] = [
  { date: "2026-03-01", cumulative_pnl: 100, daily_pnl: 100 },
  { date: "2026-03-02", cumulative_pnl: 150, daily_pnl: 50 },
  { date: "2026-03-03", cumulative_pnl: 120, daily_pnl: -30 },
];

describe("CumulativePnlChart", () => {
  it("renders empty state when data is empty", () => {
    render(<CumulativePnlChart data={[]} />);
    expect(screen.getByText("No PnL data available")).toBeDefined();
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe("Cumulative PnL chart");
  });

  it("renders chart with valid data", () => {
    render(<CumulativePnlChart data={sampleData} />);
    expect(screen.getByTestId("cumulative-pnl-chart")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
  });

  it("has Daily and Weekly granularity buttons", () => {
    render(<CumulativePnlChart data={sampleData} />);
    const dailyBtn = screen.getByText("Daily");
    const weeklyBtn = screen.getByText("Weekly");
    expect(dailyBtn).toBeDefined();
    expect(weeklyBtn).toBeDefined();
  });

  it("Daily is active by default", () => {
    render(<CumulativePnlChart data={sampleData} />);
    const dailyBtn = screen.getByText("Daily");
    expect(dailyBtn.className).toContain("bg-zinc-700");
  });

  it("switches to weekly on click", () => {
    render(<CumulativePnlChart data={sampleData} />);
    const weeklyBtn = screen.getByText("Weekly");
    fireEvent.click(weeklyBtn);
    expect(weeklyBtn.className).toContain("bg-zinc-700");
    const dailyBtn = screen.getByText("Daily");
    expect(dailyBtn.className).not.toContain("bg-zinc-700");
  });

  it("has proper aria attributes on chart container", () => {
    render(<CumulativePnlChart data={sampleData} />);
    const chart = screen.getByTestId("cumulative-pnl-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Cumulative PnL chart");
  });

  it("handles single data point", () => {
    const single: CumulativePnlPoint[] = [
      { date: "2026-03-01", cumulative_pnl: -50, daily_pnl: -50 },
    ];
    render(<CumulativePnlChart data={single} />);
    expect(screen.getByTestId("cumulative-pnl-chart")).toBeDefined();
  });
});
