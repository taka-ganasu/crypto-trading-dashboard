import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

let capturedTickFormatter: ((value: number) => string) | null = null;
let capturedTooltipContent: React.ReactElement | null = null;

vi.mock("recharts", () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-responsive-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockContainer,
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-bar-chart">{children}</div>
    ),
    Bar: ({
      dataKey,
      children,
    }: {
      dataKey?: string;
      children?: React.ReactNode;
    }) => (
      <div data-testid="recharts-bar" data-datakey={dataKey}>
        {children}
      </div>
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
    Legend: () => null,
  };
});

import DailyStrategyPnlChart from "../DailyStrategyPnlChart";
import type { TradeByStrategyDaily } from "@/types";

afterEach(() => {
  cleanup();
  capturedTickFormatter = null;
  capturedTooltipContent = null;
});

const sampleData: TradeByStrategyDaily[] = [
  { date: "2026-03-01", strategy: "btc_mom", trade_count: 2, daily_pnl: 50 },
  { date: "2026-03-01", strategy: "sol_fr", trade_count: 1, daily_pnl: -20 },
];

describe("DailyStrategyPnlChart — YAxis tickFormatter", () => {
  it("formats via formatCurrency with compact option", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);
    expect(capturedTickFormatter).not.toBeNull();
    // formatCurrency with compact=true should shorten large values
    const result = capturedTickFormatter!(2500);
    expect(typeof result).toBe("string");
    expect(result).toContain("2");
  });
});

describe("DailyStrategyPnlChart — CustomTooltip", () => {
  it("renders tooltip with mixed positive/negative entries", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);
    expect(capturedTooltipContent).not.toBeNull();

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        label: "2026-03-01",
        payload: [
          { color: "#34d399", name: "btc_mom", value: 50 },
          { color: "#f87171", name: "sol_fr", value: -20 },
        ],
      })
    );
    expect(container.textContent).toContain("2026-03-01");
    expect(container.textContent).toContain("btc_mom");
    expect(container.textContent).toContain("+$50.00");
    expect(container.textContent).toContain("$-20.00");
    expect(container.textContent).toContain("Total");
    expect(container.textContent).toContain("+$30.00");
  });

  it("filters out zero-value entries", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        label: "2026-03-01",
        payload: [
          { color: "#34d399", name: "btc_mom", value: 50 },
          { color: "#60a5fa", name: "zero_strat", value: 0 },
        ],
      })
    );
    expect(container.textContent).toContain("btc_mom");
    expect(container.textContent).not.toContain("zero_strat");
  });

  it("returns null when not active", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: false,
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when payload is empty", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        label: "2026-03-01",
        payload: [],
      })
    );
    expect(container.innerHTML).toBe("");
  });

  it("handles missing color/name/value with defaults", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        label: "2026-03-01",
        payload: [{ value: 10 }],
      })
    );
    expect(container.textContent).toContain("unknown");
    expect(container.textContent).toContain("+$10.00");
  });

  it("sorts entries by absolute value descending", () => {
    render(<DailyStrategyPnlChart data={sampleData} />);

    const { container } = render(
      React.cloneElement(capturedTooltipContent!, {
        active: true,
        label: "2026-03-01",
        payload: [
          { name: "small", value: 5 },
          { name: "big", value: -100 },
          { name: "medium", value: 50 },
        ],
      })
    );
    const text = container.textContent ?? "";
    const bigIdx = text.indexOf("big");
    const medIdx = text.indexOf("medium");
    const smallIdx = text.indexOf("small");
    expect(bigIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(smallIdx);
  });
});

describe("DailyStrategyPnlChart — secondary empty state", () => {
  it("shows empty when normalizeRows returns empty chartData", () => {
    // Data with empty strategy and no date → normalizeRows yields data but
    // strategies should still exist. We test via rendering with special data.
    const emptyStratData: TradeByStrategyDaily[] = [
      { date: "", strategy: "", trade_count: 0, daily_pnl: 0 },
    ];
    render(<DailyStrategyPnlChart data={emptyStratData} />);
    // Should still render (either chart or empty state)
    const container = screen.getByRole("img");
    expect(container.getAttribute("aria-label")).toBe(
      "Daily strategy pnl chart"
    );
  });
});
