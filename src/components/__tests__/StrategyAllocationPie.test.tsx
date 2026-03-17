import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-pie-chart">{children}</div>
    ),
    Pie: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="recharts-pie">{children}</div>
    ),
    Cell: ({ fill }: { fill?: string }) => (
      <div data-testid="recharts-cell" data-fill={fill} />
    ),
    Tooltip: () => null,
    Legend: () => null,
  };
});

import StrategyAllocationPie from "../StrategyAllocationPie";
import type { AllocationEntry } from "../StrategyAllocationPie";

afterEach(cleanup);

const sampleData: AllocationEntry[] = [
  { name: "BTC Mom", value: 41.2 },
  { name: "SOL FR", value: 23.5 },
  { name: "XRP Mom", value: 17.65 },
  { name: "HYPE", value: 17.65 },
];

describe("StrategyAllocationPie", () => {
  it("renders empty state when data is empty", () => {
    render(<StrategyAllocationPie data={[]} />);
    expect(screen.getByText("No allocation data available")).toBeDefined();
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe("Strategy allocation chart");
  });

  it("renders chart with valid data", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    expect(screen.getByTestId("strategy-allocation-pie")).toBeDefined();
    expect(screen.getByTestId("recharts-responsive-container")).toBeDefined();
  });

  it("renders a Cell for each allocation entry", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    const cells = screen.getAllByTestId("recharts-cell");
    expect(cells.length).toBe(4);
  });

  it("assigns colors to cells", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    const cells = screen.getAllByTestId("recharts-cell");
    const fills = cells.map((c) => c.getAttribute("data-fill"));
    expect(fills[0]).toBe("#34d399"); // first color
    expect(fills[1]).toBe("#60a5fa"); // second color
  });

  it("has proper aria attributes", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    const chart = screen.getByTestId("strategy-allocation-pie");
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Strategy allocation chart");
  });

  it("handles single entry", () => {
    const single: AllocationEntry[] = [{ name: "BTC", value: 100 }];
    render(<StrategyAllocationPie data={single} />);
    expect(screen.getAllByTestId("recharts-cell").length).toBe(1);
  });

  it("wraps colors when more entries than colors", () => {
    const manyEntries: AllocationEntry[] = Array.from({ length: 10 }, (_, i) => ({
      name: `Strategy ${i}`,
      value: 10,
    }));
    render(<StrategyAllocationPie data={manyEntries} />);
    const cells = screen.getAllByTestId("recharts-cell");
    expect(cells.length).toBe(10);
    // 9th entry (index 8) wraps to color index 0
    expect(cells[8].getAttribute("data-fill")).toBe(cells[0].getAttribute("data-fill"));
  });
});
