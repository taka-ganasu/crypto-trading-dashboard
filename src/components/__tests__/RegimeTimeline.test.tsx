import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

import RegimeTimeline from "../RegimeTimeline";
import type { DisplayCycle } from "../CycleTable";

afterEach(cleanup);

function makeCycle(overrides: Partial<DisplayCycle> = {}): DisplayCycle {
  return {
    id: 1,
    startTime: "2026-03-01T00:00:00Z",
    endTime: "2026-03-01T01:00:00Z",
    signalsGenerated: 5,
    tradesExecuted: 2,
    durationSeconds: 3600,
    regime: "trending",
    confidence: 0.85,
    ...overrides,
  };
}

describe("RegimeTimeline", () => {
  it("renders empty state when no cycles", () => {
    render(<RegimeTimeline cycles={[]} />);
    expect(screen.getByText("No analysis cycles found")).toBeDefined();
  });

  it("renders section with proper testid", () => {
    render(<RegimeTimeline cycles={[makeCycle()]} />);
    expect(screen.getByTestId("regime-timeline")).toBeDefined();
  });

  it("renders title", () => {
    render(<RegimeTimeline cycles={[makeCycle()]} />);
    expect(screen.getByText("Regime Transition Timeline")).toBeDefined();
  });

  it("renders legend items", () => {
    render(<RegimeTimeline cycles={[makeCycle()]} />);
    expect(screen.getAllByText("Trending").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ranging").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("High Vol").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Macro Driven").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a bar segment per cycle", () => {
    const cycles = [
      makeCycle({ id: 1, regime: "trending" }),
      makeCycle({ id: 2, regime: "ranging" }),
      makeCycle({ id: 3, regime: "high_vol" }),
    ];
    render(<RegimeTimeline cycles={cycles} />);
    const section = screen.getByTestId("regime-timeline");
    expect(section.getAttribute("role")).toBe("img");
    expect(section.getAttribute("aria-label")).toBe("Regime transition timeline chart");
  });

  it("renders event cards for recent cycles (up to 6)", () => {
    const cycles = Array.from({ length: 8 }, (_, i) =>
      makeCycle({ id: i + 1, regime: i % 2 === 0 ? "trending" : "ranging" })
    );
    render(<RegimeTimeline cycles={cycles} />);
    // Shows last 6 reversed
    const idTexts = screen.getAllByText(/^#\d+$/);
    expect(idTexts.length).toBe(6);
  });

  it("handles null startTime gracefully", () => {
    render(<RegimeTimeline cycles={[makeCycle({ startTime: null })]} />);
    expect(screen.getByTestId("regime-timeline")).toBeDefined();
  });

  it("handles invalid date string", () => {
    render(<RegimeTimeline cycles={[makeCycle({ startTime: "not-a-date" })]} />);
    // formatDateTime returns "—" for invalid
    expect(screen.getByTestId("regime-timeline")).toBeDefined();
  });

  it("renders all regime types correctly", () => {
    const regimes = ["trending", "ranging", "high_vol", "macro_driven", "no_data", "unknown"] as const;
    const cycles = regimes.map((regime, i) => makeCycle({ id: i + 1, regime }));
    render(<RegimeTimeline cycles={cycles} />);
    expect(screen.getByTestId("regime-timeline")).toBeDefined();
  });
});
