import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";

// Mock recharts with YAxis tickFormatter capture
let capturedTickFormatter: ((value: number) => string) | null = null;
let capturedTooltipContent: React.ReactElement<Record<string, unknown>> | null = null;

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-bar-chart">{children}</div>
    ),
    Bar: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="recharts-bar">{children}</div>
    ),
    Cell: () => <div data-testid="recharts-cell" />,
    XAxis: () => null,
    YAxis: ({ tickFormatter }: { tickFormatter?: (v: number) => string }) => {
      capturedTickFormatter = tickFormatter ?? null;
      return null;
    },
    CartesianGrid: () => null,
    Tooltip: ({ content }: { content?: React.ReactElement<Record<string, unknown>> }) => {
      capturedTooltipContent = content ?? null;
      return null;
    },
  };
});

import DailyPnlChart from "../DailyPnlChart";
import type { DailyPnlPoint } from "../DailyPnlChart";

afterEach(() => {
  cleanup();
  capturedTickFormatter = null;
  capturedTooltipContent = null;
});

const sampleData: DailyPnlPoint[] = [
  { date: "2026-03-01", daily_pnl: 50 },
  { date: "2026-03-02", daily_pnl: -30 },
];

describe("DailyPnlChart — formatPnl (YAxis tick formatter)", () => {
  it("formats thousands as $XK", () => {
    render(<DailyPnlChart data={sampleData} />);
    expect(capturedTickFormatter).not.toBeNull();
    expect(capturedTickFormatter!(2500)).toBe("$2.5K");
    expect(capturedTickFormatter!(1000)).toBe("$1.0K");
  });

  it("formats small values as $X", () => {
    render(<DailyPnlChart data={sampleData} />);
    expect(capturedTickFormatter!(500)).toBe("$500");
    expect(capturedTickFormatter!(0)).toBe("$0");
  });

  it("formats negative thousands", () => {
    render(<DailyPnlChart data={sampleData} />);
    expect(capturedTickFormatter!(-2000)).toBe("$-2.0K");
  });
});

describe("DailyPnlChart — CustomTooltip", () => {
  it("renders tooltip with positive pnl", () => {
    render(<DailyPnlChart data={sampleData} />);
    expect(capturedTooltipContent).not.toBeNull();

    // Render the tooltip component with active state
    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [{ payload: { date: "2026-03-01", daily_pnl: 50 } }],
      })
    );
    expect(container.textContent).toContain("2026-03-01");
    expect(container.textContent).toContain("+$50.00");
  });

  it("renders tooltip with negative pnl", () => {
    render(<DailyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [{ payload: { date: "2026-03-02", daily_pnl: -30 } }],
      })
    );
    expect(container.textContent).toContain("$-30.00");
  });

  it("returns null when not active", () => {
    render(<DailyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: false,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when payload is empty", () => {
    render(<DailyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });
});
