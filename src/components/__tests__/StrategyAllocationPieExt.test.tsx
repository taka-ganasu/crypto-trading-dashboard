import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";

let capturedTooltipContent: React.ReactElement<Record<string, unknown>> | null = null;
let capturedLegendFormatter: ((value: string) => React.ReactNode) | null = null;
let capturedPieLabel: ((props: Record<string, unknown>) => string) | null = null;

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-pie-chart">{children}</div>
    ),
    Pie: ({
      children,
      label,
    }: {
      children?: React.ReactNode;
      label?: (props: Record<string, unknown>) => string;
    }) => {
      capturedPieLabel = label ?? null;
      return <div data-testid="recharts-pie">{children}</div>;
    },
    Cell: ({ fill }: { fill?: string }) => (
      <div data-testid="recharts-cell" data-fill={fill} />
    ),
    Tooltip: ({ content }: { content?: React.ReactElement<Record<string, unknown>> }) => {
      capturedTooltipContent = content ?? null;
      return null;
    },
    Legend: ({
      formatter,
    }: {
      formatter?: (value: string) => React.ReactNode;
    }) => {
      capturedLegendFormatter = formatter ?? null;
      return null;
    },
  };
});

import StrategyAllocationPie from "../StrategyAllocationPie";
import type { AllocationEntry } from "../StrategyAllocationPie";

afterEach(() => {
  cleanup();
  capturedTooltipContent = null;
  capturedLegendFormatter = null;
  capturedPieLabel = null;
});

const sampleData: AllocationEntry[] = [
  { name: "BTC Mom", value: 41.2 },
  { name: "SOL FR", value: 23.5 },
];

describe("StrategyAllocationPie — CustomTooltip", () => {
  it("renders tooltip with active entry", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    expect(capturedTooltipContent).not.toBeNull();

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [{ name: "BTC Mom", value: 41.2 }],
      })
    );
    expect(container.textContent).toContain("BTC Mom");
    expect(container.textContent).toContain("41.2%");
  });

  it("returns null when not active", () => {
    render(<StrategyAllocationPie data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: false,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when payload is empty", () => {
    render(<StrategyAllocationPie data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("StrategyAllocationPie — renderLegendText", () => {
  it("renders legend text as a span", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    expect(capturedLegendFormatter).not.toBeNull();

    const result = capturedLegendFormatter!("BTC Mom");
    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toBe("BTC Mom");
    expect(container.querySelector("span")).not.toBeNull();
  });
});

describe("StrategyAllocationPie — Pie label", () => {
  it("formats label as name + value%", () => {
    render(<StrategyAllocationPie data={sampleData} />);
    expect(capturedPieLabel).not.toBeNull();

    const label = capturedPieLabel!({ name: "SOL FR", value: 23.5 });
    expect(label).toBe("SOL FR 23.5%");
  });
});
