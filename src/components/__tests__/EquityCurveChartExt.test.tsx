import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

let capturedTickFormatter: ((value: number) => string) | null = null;
let capturedTooltipContent: React.ReactElement<Record<string, unknown>> | null = null;

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    AreaChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-area-chart">{children}</div>
    ),
    Area: () => <div data-testid="recharts-area" />,
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

import EquityCurveChart from "../EquityCurveChart";
import type { EquityCurvePoint } from "../EquityCurveChart";

afterEach(() => {
  cleanup();
  capturedTickFormatter = null;
  capturedTooltipContent = null;
});

const profitData: EquityCurvePoint[] = [
  { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
  { date: "2026-03-02", balance: 1050, daily_pnl: 50, cumulative_pnl: 50 },
];

describe("EquityCurveChart — formatBalance (YAxis tick)", () => {
  it("formats millions", () => {
    render(<EquityCurveChart data={profitData} />);
    expect(capturedTickFormatter).not.toBeNull();
    expect(capturedTickFormatter!(2_500_000)).toBe("$2.5M");
    expect(capturedTickFormatter!(1_000_000)).toBe("$1.0M");
  });

  it("formats thousands", () => {
    render(<EquityCurveChart data={profitData} />);
    expect(capturedTickFormatter!(5_000)).toBe("$5.0K");
    expect(capturedTickFormatter!(1_000)).toBe("$1.0K");
  });

  it("formats small values", () => {
    render(<EquityCurveChart data={profitData} />);
    expect(capturedTickFormatter!(500)).toBe("$500");
    expect(capturedTickFormatter!(0)).toBe("$0");
  });
});

describe("EquityCurveChart — CustomTooltip", () => {
  it("renders tooltip with profit data", () => {
    render(<EquityCurveChart data={profitData} />);
    expect(capturedTooltipContent).not.toBeNull();

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [
          {
            payload: {
              date: "2026-03-02",
              balance: 1050,
              daily_pnl: 50,
              cumulative_pnl: 50,
            },
          },
        ],
      })
    );
    expect(container.textContent).toContain("2026-03-02");
    expect(container.textContent).toContain("+$50.00");
    expect(container.textContent).toContain("+$50.00");
  });

  it("renders tooltip with loss data (negative pnl)", () => {
    render(<EquityCurveChart data={profitData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [
          {
            payload: {
              date: "2026-03-02",
              balance: 950,
              daily_pnl: -30,
              cumulative_pnl: -30,
            },
          },
        ],
      })
    );
    expect(container.textContent).toContain("$-30.00");
  });

  it("returns null when not active", () => {
    render(<EquityCurveChart data={profitData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: false,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when payload is empty", () => {
    render(<EquityCurveChart data={profitData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows balance formatted in tooltip", () => {
    render(<EquityCurveChart data={profitData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        payload: [
          {
            payload: {
              date: "2026-03-02",
              balance: 5000,
              daily_pnl: 100,
              cumulative_pnl: 100,
            },
          },
        ],
      })
    );
    // formatBalance(5000) = "$5.0K"
    expect(container.textContent).toContain("$5.0K");
  });
});
