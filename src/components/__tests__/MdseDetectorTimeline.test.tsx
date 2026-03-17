import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { MdseTimeline } from "@/types";

vi.mock("next/dynamic", () => ({
  default: () =>
    ({ data }: { data: MdseTimeline | null }) => (
      <div data-testid="mdse-timeline-chart-mock">
        {data ? `${data.prices.length}:${data.events.length}` : "no-data"}
      </div>
    ),
}));

import MdseDetectorTimeline from "../mdse/MdseDetectorTimeline";

afterEach(cleanup);

describe("MdseDetectorTimeline", () => {
  it("renders the timeline section and passes data to the dynamic chart", () => {
    const timeline: MdseTimeline = {
      prices: [{ timestamp: "2026-03-18T00:00:00Z", price: 70000, symbol: "BTC/USDT" }],
      events: [],
    };

    render(<MdseDetectorTimeline timeline={timeline} />);

    expect(screen.getByText("Detector Timeline")).toBeDefined();
    expect(screen.getByTestId("mdse-timeline-chart-mock").textContent).toBe("1:0");
  });

  it("passes null timeline through to the chart", () => {
    render(<MdseDetectorTimeline timeline={null} />);

    expect(screen.getByTestId("mdse-timeline-chart-mock").textContent).toBe("no-data");
  });
});
