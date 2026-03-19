/**
 * Extended MdseOverview tests — winRateColor/winRateBorder boundary
 * values and toPercent edge cases (NaN, Infinity, null, undefined).
 *
 * These helper functions are private to MdseOverview, so they are
 * tested indirectly via component rendering.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { MdseSummaryDetector } from "@/types";

vi.mock("@/components/TimeRangeFilter", () => ({
  default: () => <div data-testid="time-range-filter" />,
}));

vi.mock("@/lib/format", () => ({
  formatPnl: (value: number) => `PNL:${value.toFixed(2)}`,
  colorByPnl: (value: number) => (value >= 0 ? "gain" : "loss"),
  formatTimestamp: (value: string) => `TS:${value}`,
}));

import MdseOverview from "../mdse/MdseOverview";

afterEach(cleanup);

/** Factory for detector with specific win_rate */
function makeDetector(
  name: string,
  winRate: number | null | undefined
): MdseSummaryDetector {
  return {
    detector_name: name,
    event_count: 5,
    validated_count: 3,
    win_rate: winRate as number,
    avg_pnl: 1.0,
    weight: 1.0,
    sample_count: 10,
    last_event_at: "2026-03-20T00:00:00Z",
  };
}

/* ------------------------------------------------------------------ */
/* winRateColor — boundary values at 30% and 50%                       */
/* ------------------------------------------------------------------ */

describe("MdseOverview — winRateColor boundaries", () => {
  it("win_rate exactly 30% (0.30) → yellow (not red)", () => {
    render(<MdseOverview detectors={[makeDetector("b30", 0.3)]} />);
    const el = screen.getByText("30.0%");
    expect(el.className).toContain("text-yellow-400");
    expect(el.className).not.toContain("text-red-400");
  });

  it("win_rate exactly 50% (0.50) → yellow (not emerald)", () => {
    render(<MdseOverview detectors={[makeDetector("b50", 0.5)]} />);
    const el = screen.getByText("50.0%");
    expect(el.className).toContain("text-yellow-400");
    expect(el.className).not.toContain("text-emerald-400");
  });

  it("win_rate 29.9% (0.299) → red (< 30)", () => {
    render(<MdseOverview detectors={[makeDetector("b29", 0.299)]} />);
    const el = screen.getByText("29.9%");
    expect(el.className).toContain("text-red-400");
  });

  it("win_rate 50.1% (0.501) → emerald (> 50)", () => {
    render(<MdseOverview detectors={[makeDetector("b51", 0.501)]} />);
    const el = screen.getByText("50.1%");
    expect(el.className).toContain("text-emerald-400");
  });

  it("win_rate 0% (0.0) → red (< 30)", () => {
    render(<MdseOverview detectors={[makeDetector("b0", 0.0)]} />);
    const el = screen.getByText("0.0%");
    expect(el.className).toContain("text-red-400");
  });

  it("win_rate 100% (1.0) → emerald (> 50)", () => {
    render(<MdseOverview detectors={[makeDetector("b100", 1.0)]} />);
    const el = screen.getByText("100.0%");
    expect(el.className).toContain("text-emerald-400");
  });
});

/* ------------------------------------------------------------------ */
/* winRateBorder — boundary values                                     */
/* ------------------------------------------------------------------ */

describe("MdseOverview — winRateBorder boundaries", () => {
  it("exactly 30% → yellow border", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector("bb30", 0.3)]} />
    );
    expect(
      container.querySelector(".border-yellow-500\\/30")
    ).not.toBeNull();
  });

  it("exactly 50% → yellow border", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector("bb50", 0.5)]} />
    );
    expect(
      container.querySelector(".border-yellow-500\\/30")
    ).not.toBeNull();
  });

  it("above 50% → emerald border", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector("bb51", 0.51)]} />
    );
    expect(
      container.querySelector(".border-emerald-500\\/30")
    ).not.toBeNull();
  });

  it("below 30% → red border", () => {
    const { container } = render(
      <MdseOverview detectors={[makeDetector("bb29", 0.29)]} />
    );
    expect(
      container.querySelector(".border-red-500\\/30")
    ).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* toPercent — null/undefined/NaN/Infinity                             */
/* ------------------------------------------------------------------ */

describe("MdseOverview — toPercent edge cases", () => {
  it("null win_rate → shows '—' and applies color for 0% (red)", () => {
    render(<MdseOverview detectors={[makeDetector("tn", null)]} />);
    // null check: d.win_rate != null ? ... : "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("NaN win_rate → toPercent returns 0, renders '0.0%' with red", () => {
    render(<MdseOverview detectors={[makeDetector("tnan", NaN)]} />);
    const el = screen.getByText("0.0%");
    expect(el.className).toContain("text-red-400");
  });

  it("Infinity win_rate → toPercent returns 0, renders '0.0%' with red", () => {
    render(<MdseOverview detectors={[makeDetector("tinf", Infinity)]} />);
    const el = screen.getByText("0.0%");
    expect(el.className).toContain("text-red-400");
  });

  it("-Infinity win_rate → toPercent returns 0, renders '0.0%' with red", () => {
    render(
      <MdseOverview detectors={[makeDetector("tninf", -Infinity)]} />
    );
    const el = screen.getByText("0.0%");
    expect(el.className).toContain("text-red-400");
  });
});
