import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { MdseEvent } from "@/types";

vi.mock("@/lib/format", () => ({
  formatTimestamp: (value: string) => `TS:${value}`,
}));

import MdseEvents from "../mdse/MdseEvents";

afterEach(cleanup);

const events: MdseEvent[] = [
  {
    id: 1,
    detector_name: "fr_extreme",
    symbol: "BTC/USDT",
    direction: "buy",
    confidence: 120,
    timestamp: "2026-03-18T00:00:00Z",
  },
  {
    id: 2,
    detector: "sentiment_spike",
    symbol: "SOL/USDT",
    direction: "long",
    confidence: 0.5,
    timestamp: "2026-03-18T00:30:00Z",
  },
  {
    id: 3,
    detector: "liq_cascade",
    symbol: "ETH/USDT",
    direction: "short",
    confidence: -0.5,
    timestamp: "2026-03-18T01:00:00Z",
  },
];

describe("MdseEvents", () => {
  it("renders events with detector fallbacks, confidence clamping, and direction styles", () => {
    const { container } = render(<MdseEvents events={events} />);

    expect(screen.getByText("Recent Events")).toBeDefined();
    expect(screen.getByText("3 events")).toBeDefined();
    expect(screen.getByText("fr_extreme")).toBeDefined();
    expect(screen.getByText("sentiment_spike")).toBeDefined();
    expect(screen.getByText("liq_cascade")).toBeDefined();
    expect(screen.getByText("BUY").className).toContain("text-emerald-400");
    expect(screen.getAllByText("LONG")[0].className).toContain("text-emerald-400");
    expect(screen.getByText("SHORT").className).toContain("text-red-400");
    expect(screen.getByText("100.0%")).toBeDefined();
    expect(screen.getByText("50.0%")).toBeDefined();
    expect(screen.getByText("0.0%")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(container.querySelector(".bg-yellow-500")).not.toBeNull();
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
    expect(screen.getByText("TS:2026-03-18T00:00:00Z")).toBeDefined();
  });

  it("renders an empty state when no events exist", () => {
    render(<MdseEvents events={[]} />);

    expect(screen.getByText("No events found")).toBeDefined();
  });
});
