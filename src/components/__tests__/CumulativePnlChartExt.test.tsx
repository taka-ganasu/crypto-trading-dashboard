import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

let capturedTickFormatter: ((value: number) => string) | null = null;
let capturedTooltipContent: React.ReactElement | null = null;

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    AreaChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-area-chart">{children}</div>
    ),
    Area: ({ stroke }: { stroke?: string }) => (
      <div data-testid="recharts-area" data-stroke={stroke} />
    ),
    XAxis: () => null,
    YAxis: ({ tickFormatter }: { tickFormatter?: (v: number) => string }) => {
      capturedTickFormatter = tickFormatter ?? null;
      return null;
    },
    CartesianGrid: () => null,
    Tooltip: ({ content }: { content?: React.ReactElement }) => {
      capturedTooltipContent = content ?? null;
      return null;
    },
    ReferenceLine: () => null,
  };
});

import CumulativePnlChart from "../CumulativePnlChart";
import type { CumulativePnlPoint } from "../CumulativePnlChart";

afterEach(() => {
  cleanup();
  capturedTickFormatter = null;
  capturedTooltipContent = null;
});

const sampleData: CumulativePnlPoint[] = [
  { date: "2026-03-01", cumulative_pnl: 100, daily_pnl: 100 },
  { date: "2026-03-02", cumulative_pnl: 150, daily_pnl: 50 },
  { date: "2026-03-03", cumulative_pnl: 120, daily_pnl: -30 },
];

describe("CumulativePnlChart — formatPnl (YAxis tick)", () => {
  it("formats millions", () => {
    render(<CumulativePnlChart data={sampleData} />);
    expect(capturedTickFormatter).not.toBeNull();
    expect(capturedTickFormatter!(2_500_000)).toBe("$2.5M");
    expect(capturedTickFormatter!(1_000_000)).toBe("$1.0M");
  });

  it("formats thousands", () => {
    render(<CumulativePnlChart data={sampleData} />);
    expect(capturedTickFormatter!(5_000)).toBe("$5.0K");
    expect(capturedTickFormatter!(-2_000)).toBe("$-2.0K");
  });

  it("formats small values", () => {
    render(<CumulativePnlChart data={sampleData} />);
    expect(capturedTickFormatter!(500)).toBe("$500");
    expect(capturedTickFormatter!(0)).toBe("$0");
  });

  it("formats negative millions", () => {
    render(<CumulativePnlChart data={sampleData} />);
    expect(capturedTickFormatter!(-1_500_000)).toBe("$-1.5M");
  });
});

describe("CumulativePnlChart — CustomTooltip", () => {
  it("renders daily tooltip with positive cumulative", () => {
    render(<CumulativePnlChart data={sampleData} />);
    expect(capturedTooltipContent).not.toBeNull();

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [
          {
            payload: {
              date: "2026-03-02",
              cumulative_pnl: 150,
              daily_pnl: 50,
            },
          },
        ],
      })
    );
    expect(container.textContent).toContain("2026-03-02");
    expect(container.textContent).toContain("+$150.00");
    expect(container.textContent).toContain("Daily PnL");
    expect(container.textContent).toContain("+$50.00");
  });

  it("renders tooltip with negative values", () => {
    render(<CumulativePnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [
          {
            payload: {
              date: "2026-03-03",
              cumulative_pnl: -50,
              daily_pnl: -30,
            },
          },
        ],
      })
    );
    expect(container.textContent).toContain("$-50.00");
    expect(container.textContent).toContain("$-30.00");
  });

  it("returns null when not active", () => {
    render(<CumulativePnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: false,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows Weekly PnL label when in weekly mode", () => {
    render(<CumulativePnlChart data={sampleData} />);

    // Switch to weekly
    fireEvent.click(screen.getByText("Weekly"));

    // Re-capture tooltip after re-render
    expect(capturedTooltipContent).not.toBeNull();

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [
          {
            payload: {
              date: "2026-03-01",
              cumulative_pnl: 120,
              daily_pnl: 120,
            },
          },
        ],
      })
    );
    expect(container.textContent).toContain("Weekly PnL");
  });
});

describe("CumulativePnlChart — weekly aggregation", () => {
  it("aggregates data by week when Weekly is selected", () => {
    // 7 days of data across 2 weeks
    const weekData: CumulativePnlPoint[] = [
      { date: "2026-03-02", cumulative_pnl: 10, daily_pnl: 10 },
      { date: "2026-03-03", cumulative_pnl: 25, daily_pnl: 15 },
      { date: "2026-03-09", cumulative_pnl: 50, daily_pnl: 25 },
      { date: "2026-03-10", cumulative_pnl: 70, daily_pnl: 20 },
    ];
    render(<CumulativePnlChart data={weekData} />);
    fireEvent.click(screen.getByText("Weekly"));
    // Chart should still render without error
    expect(screen.getByTestId("cumulative-pnl-chart")).toBeDefined();
  });
});

describe("CumulativePnlChart — stroke color", () => {
  it("uses red stroke when cumulative loss", () => {
    const lossData: CumulativePnlPoint[] = [
      { date: "2026-03-01", cumulative_pnl: -50, daily_pnl: -50 },
      { date: "2026-03-02", cumulative_pnl: -80, daily_pnl: -30 },
    ];
    render(<CumulativePnlChart data={lossData} />);
    const area = screen.getByTestId("recharts-area");
    expect(area.getAttribute("data-stroke")).toBe("#f87171");
  });

  it("uses green stroke when cumulative profit", () => {
    render(<CumulativePnlChart data={sampleData} />);
    const area = screen.getByTestId("recharts-area");
    expect(area.getAttribute("data-stroke")).toBe("#34d399");
  });
});
