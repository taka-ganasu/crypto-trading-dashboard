import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { MdseSummaryDetector } from "@/types";

vi.mock("@/components/TimeRangeFilter", () => ({
  default: () => <div data-testid="time-range-filter">range filter</div>,
}));

vi.mock("@/lib/format", () => ({
  formatPnl: (value: number) => `PNL:${value.toFixed(2)}`,
  colorByPnl: (value: number) => (value >= 0 ? "gain" : "loss"),
  formatTimestamp: (value: string) => `TS:${value}`,
}));

import MdseOverview from "../mdse/MdseOverview";

afterEach(cleanup);

function makeDetector(overrides: Partial<MdseSummaryDetector> = {}): MdseSummaryDetector {
  return {
    detector_name: "test-detector",
    event_count: 5,
    validated_count: 3,
    win_rate: 0.55,
    avg_pnl: 10,
    weight: 1.0,
    sample_count: 15,
    last_event_at: "2026-03-18T00:00:00Z",
    ...overrides,
  };
}

describe("MdseOverview — winRateColor boundary values", () => {
  it("applies emerald for win_rate exactly at 51% (decimal 0.51)", () => {
    render(<MdseOverview detectors={[makeDetector({ detector_name: "d1", win_rate: 0.51 })]} />);
    expect(screen.getByText("51.0%").className).toContain("text-emerald-400");
  });

  it("applies yellow for win_rate exactly at 50% (decimal 0.50)", () => {
    render(<MdseOverview detectors={[makeDetector({ detector_name: "d2", win_rate: 0.50 })]} />);
    expect(screen.getByText("50.0%").className).toContain("text-yellow-400");
  });

  it("applies yellow for win_rate exactly at 30% (decimal 0.30)", () => {
    render(<MdseOverview detectors={[makeDetector({ detector_name: "d3", win_rate: 0.30 })]} />);
    expect(screen.getByText("30.0%").className).toContain("text-yellow-400");
  });

  it("applies red for win_rate exactly at 29% (decimal 0.29)", () => {
    render(<MdseOverview detectors={[makeDetector({ detector_name: "d4", win_rate: 0.29 })]} />);
    expect(screen.getByText("29.0%").className).toContain("text-red-400");
  });

  it("applies emerald for win_rate already as percentage (e.g. 60)", () => {
    render(<MdseOverview detectors={[makeDetector({ detector_name: "d5", win_rate: 60 })]} />);
    expect(screen.getByText("60.0%").className).toContain("text-emerald-400");
  });

  it("applies red for win_rate of 0", () => {
    render(<MdseOverview detectors={[makeDetector({ detector_name: "d6", win_rate: 0 })]} />);
    expect(screen.getByText("0.0%").className).toContain("text-red-400");
  });
});

describe("MdseOverview — winRateBorder boundary values", () => {
  it("applies emerald border for high win rate", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector({ detector_name: "b1", win_rate: 0.75 })]} />
    );
    expect(container.querySelector(".border-emerald-500\\/30")).not.toBeNull();
  });

  it("applies red border for low win rate", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector({ detector_name: "b2", win_rate: 0.10 })]} />
    );
    expect(container.querySelector(".border-red-500\\/30")).not.toBeNull();
  });

  it("applies yellow border for mid win rate", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector({ detector_name: "b3", win_rate: 0.40 })]} />
    );
    expect(container.querySelector(".border-yellow-500\\/30")).not.toBeNull();
  });
});

describe("MdseOverview — toPercent edge cases", () => {
  it("shows dash for null win_rate", () => {
    render(
      <MdseOverview
        detectors={[makeDetector({ detector_name: "e1", win_rate: null as unknown as number })]}
      />
    );
    expect(screen.getByText("—")).toBeDefined();
  });

  it("falls back to 0% for NaN win_rate and applies red color", () => {
    render(
      <MdseOverview detectors={[makeDetector({ detector_name: "e2", win_rate: NaN })]} />
    );
    expect(screen.getByText("0.0%").className).toContain("text-red-400");
  });

  it("falls back to 0% for Infinity win_rate", () => {
    render(
      <MdseOverview detectors={[makeDetector({ detector_name: "e3", win_rate: Infinity })]} />
    );
    expect(screen.getByText("0.0%").className).toContain("text-red-400");
  });
});

describe("MdseOverview — null field fallbacks", () => {
  it("shows dashes for all nullable fields set to null", () => {
    render(
      <MdseOverview
        detectors={[
          makeDetector({
            detector_name: "null-det",
            avg_pnl: null,
            weight: null,
            sample_count: null,
            last_event_at: null,
          }),
        ]}
      />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("renders multiple detector cards correctly", () => {
    const detectors = Array.from({ length: 5 }, (_, i) =>
      makeDetector({ detector_name: `det-${i}`, event_count: i + 1 })
    );
    render(<MdseOverview detectors={detectors} />);

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`det-${i}`)).toBeDefined();
    }
  });
});
