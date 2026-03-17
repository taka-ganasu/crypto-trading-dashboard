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

const detectors: MdseSummaryDetector[] = [
  {
    detector_name: "high-win",
    event_count: 10,
    validated_count: 8,
    win_rate: 0.6,
    avg_pnl: 12.34,
    weight: 1.23,
    sample_count: 20,
    last_event_at: "2026-03-18T00:00:00Z",
  },
  {
    detector_name: "low-win",
    event_count: 4,
    validated_count: 1,
    win_rate: 0.2,
    avg_pnl: -4.56,
    weight: 0.45,
    sample_count: 9,
    last_event_at: "2026-03-17T00:00:00Z",
  },
  {
    detector_name: "mid-win",
    event_count: 3,
    validated_count: 2,
    win_rate: 45,
    avg_pnl: null,
    weight: null,
    sample_count: null,
    last_event_at: null,
  },
];

describe("MdseOverview", () => {
  it("renders the header, range filter, and detector cards", () => {
    const { container } = render(<MdseOverview detectors={detectors} />);

    expect(screen.getByText("MDSE Detector Status")).toBeDefined();
    expect(screen.getByTestId("time-range-filter")).toBeDefined();
    expect(screen.getByText("high-win")).toBeDefined();
    expect(screen.getByText("60.0%").className).toContain("text-emerald-400");
    expect(screen.getByText("20.0%").className).toContain("text-red-400");
    expect(screen.getByText("45.0%").className).toContain("text-yellow-400");
    expect(screen.getByText("PNL:12.34").className).toContain("gain");
    expect(screen.getByText("PNL:-4.56").className).toContain("loss");
    expect(container.querySelector(".border-emerald-500\\/30")).not.toBeNull();
    expect(container.querySelector(".border-red-500\\/30")).not.toBeNull();
    expect(container.querySelector(".border-yellow-500\\/30")).not.toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("renders an empty state with no detectors", () => {
    render(<MdseOverview detectors={[]} />);

    expect(screen.getByText("No detector data available")).toBeDefined();
  });
});
