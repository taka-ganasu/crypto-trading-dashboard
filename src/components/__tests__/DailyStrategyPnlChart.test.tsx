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
    Bar: ({ dataKey, children }: { dataKey?: string; children?: React.ReactNode }) => (
      <div data-testid="recharts-bar" data-datakey={dataKey}>{children}</div>
    ),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

import DailyStrategyPnlChart from "../DailyStrategyPnlChart";
import type { TradeByStrategyDaily } from "@/types";

afterEach(cleanup);

const sampleData: TradeByStrategyDaily[] = [
  { date: "2026-03-01", strategy: "btc_mom", trade_count: 2, daily_pnl: 50 },
  { date: "2026-03-01", strategy: "sol_fr", trade_count: 1, daily_pnl: -20 },
  { date: "2026-03-02", strategy: "btc_mom", trade_count: 3, daily_pnl: 30 },
  { date: "2026-03-02", strategy: "sol_fr", trade_count: 1, daily_pnl: 10 },
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
  });

  it("creates a Bar for each strategy", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);
    const bars = screen.getAllByTestId("recharts-bar");
    expect(bars.length).toBe(2); // btc_mom, sol_fr
  });

  it("uses correct dataKey per strategy", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);
    const bars = screen.getAllByTestId("recharts-bar");
    const keys = bars.map((b) => b.getAttribute("data-datakey"));
    expect(keys).toContain("btc_mom");
    expect(keys).toContain("sol_fr");
  });

  it("has proper aria attributes", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);
    const chart = screen.getByTestId("daily-strategy-pnl-chart");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Daily strategy pnl chart");
  });

  it("handles null strategy as unknown", () => {
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "", trade_count: 1, daily_pnl: 10 },
    ];
    render(<DailyStrategyPnlChart data={data} />);
    const bars = screen.getAllByTestId("recharts-bar");
    const keys = bars.map((b) => b.getAttribute("data-datakey"));
    expect(keys).toContain("unknown");
  });

  it("handles null daily_pnl as zero", () => {
    const data = [
      { date: "2026-03-01", strategy: "btc_mom", trade_count: 1, daily_pnl: null },
    ] as unknown as TradeByStrategyDaily[];
    render(<DailyStrategyPnlChart data={data} />);
    expect(screen.getByTestId("daily-strategy-pnl-chart")).toBeDefined();
  });

  it("aggregates same date+strategy rows", () => {
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "btc_mom", trade_count: 1, daily_pnl: 10 },
      { date: "2026-03-01", strategy: "btc_mom", trade_count: 2, daily_pnl: 20 },
    ];
    render(<DailyStrategyPnlChart data={data} />);
    const bars = screen.getAllByTestId("recharts-bar");
    expect(bars.length).toBe(1); // single strategy
  });

  it("sorts strategies alphabetically", () => {
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "z_strat", trade_count: 1, daily_pnl: 10 },
      { date: "2026-03-01", strategy: "a_strat", trade_count: 1, daily_pnl: 5 },
    ];
    render(<DailyStrategyPnlChart data={data} />);
    const bars = screen.getAllByTestId("recharts-bar");
    const keys = bars.map((b) => b.getAttribute("data-datakey"));
    expect(keys).toEqual(["a_strat", "z_strat"]);
  });
});
