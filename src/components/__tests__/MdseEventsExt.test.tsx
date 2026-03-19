import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { MdseEvent } from "@/types";

vi.mock("@/lib/format", () => ({
  formatTimestamp: (value: string) => `TS:${value}`,
}));

import MdseEvents from "../mdse/MdseEvents";

afterEach(cleanup);

function makeEvent(overrides: Partial<MdseEvent> = {}): MdseEvent {
  return {
    id: 1,
    detector: "test_det",
    symbol: "BTC/USDT",
    direction: "long",
    confidence: 0.7,
    timestamp: "2026-03-18T00:00:00Z",
    ...overrides,
  };
}

describe("MdseEvents — confidence bar color thresholds", () => {
  it("applies emerald bar for confidence >= 70%", () => {
    const { container } = render(
      <MdseEvents events={[makeEvent({ id: 1, confidence: 0.70 })]} />
    );
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  });

  it("applies yellow bar for confidence between 40-69%", () => {
    const { container } = render(
      <MdseEvents events={[makeEvent({ id: 2, confidence: 0.50 })]} />
    );
    expect(container.querySelector(".bg-yellow-500")).not.toBeNull();
  });

  it("applies red bar for confidence < 40%", () => {
    const { container } = render(
      <MdseEvents events={[makeEvent({ id: 3, confidence: 0.30 })]} />
    );
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
  });

  it("applies emerald bar for confidence at boundary 70%", () => {
    const { container } = render(
      <MdseEvents events={[makeEvent({ id: 4, confidence: 70 })]} />
    );
    // 70 > 1 so toPercent returns 70 as-is; 70 >= 70 → emerald
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  });

  it("applies yellow bar for confidence at boundary 40%", () => {
    const { container } = render(
      <MdseEvents events={[makeEvent({ id: 5, confidence: 0.40 })]} />
    );
    expect(container.querySelector(".bg-yellow-500")).not.toBeNull();
  });
});

describe("MdseEvents — confidence clamping", () => {
  it("clamps confidence above 100% to 100%", () => {
    render(<MdseEvents events={[makeEvent({ id: 10, confidence: 200 })]} />);
    expect(screen.getByText("100.0%")).toBeDefined();
  });

  it("clamps negative confidence to 0%", () => {
    render(<MdseEvents events={[makeEvent({ id: 11, confidence: -50 })]} />);
    expect(screen.getByText("0.0%")).toBeDefined();
  });

  it("shows 0.0% for confidence of exactly 0", () => {
    render(<MdseEvents events={[makeEvent({ id: 12, confidence: 0 })]} />);
    expect(screen.getByText("0.0%")).toBeDefined();
  });
});

describe("MdseEvents — direction styling", () => {
  it("applies emerald for 'buy' direction (case insensitive via source)", () => {
    render(<MdseEvents events={[makeEvent({ id: 20, direction: "buy" })]} />);
    expect(screen.getByText("BUY").className).toContain("text-emerald-400");
  });

  it("applies emerald for 'long' direction", () => {
    render(<MdseEvents events={[makeEvent({ id: 21, direction: "long" })]} />);
    expect(screen.getByText("LONG").className).toContain("text-emerald-400");
  });

  it("applies red for 'short' direction", () => {
    render(<MdseEvents events={[makeEvent({ id: 22, direction: "short" })]} />);
    expect(screen.getByText("SHORT").className).toContain("text-red-400");
  });

  it("applies red for 'sell' direction (not recognized as long)", () => {
    render(<MdseEvents events={[makeEvent({ id: 23, direction: "sell" })]} />);
    expect(screen.getByText("SELL").className).toContain("text-red-400");
  });
});

describe("MdseEvents — detector label fallbacks", () => {
  it("prefers detector field over detector_name", () => {
    render(
      <MdseEvents
        events={[makeEvent({ id: 30, detector: "primary_det", detector_name: "fallback_det" })]}
      />
    );
    expect(screen.getByText("primary_det")).toBeDefined();
  });

  it("uses detector_name when detector is undefined", () => {
    const event = makeEvent({ id: 31, detector_name: "secondary_det" });
    delete (event as Record<string, unknown>).detector;
    render(<MdseEvents events={[event]} />);
    expect(screen.getByText("secondary_det")).toBeDefined();
  });
});

describe("MdseEvents — event count display", () => {
  it("displays correct count for multiple events", () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ id: i + 100, detector: `det_${i}`, symbol: `SYM${i}/USDT` })
    );
    render(<MdseEvents events={events} />);
    expect(screen.getByText("7 events")).toBeDefined();
  });

  it("displays 0 events with empty state message", () => {
    render(<MdseEvents events={[]} />);
    expect(screen.getByText("0 events")).toBeDefined();
    expect(screen.getByText("No events found")).toBeDefined();
  });

  it("displays 1 events for single event", () => {
    render(<MdseEvents events={[makeEvent()]} />);
    expect(screen.getByText("1 events")).toBeDefined();
  });
});

describe("MdseEvents — timestamp rendering", () => {
  it("formats timestamp through formatTimestamp", () => {
    render(
      <MdseEvents events={[makeEvent({ id: 40, timestamp: "2026-03-18T12:30:00Z" })]} />
    );
    expect(screen.getByText("TS:2026-03-18T12:30:00Z")).toBeDefined();
  });
});
