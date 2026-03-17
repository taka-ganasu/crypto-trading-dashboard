import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import CycleTable from "../CycleTable";
import type { DisplayCycle } from "../CycleTable";

afterEach(cleanup);

function makeCycle(overrides: Partial<DisplayCycle> = {}): DisplayCycle {
  return {
    id: 1,
    startTime: "2026-03-01T00:00:00Z",
    endTime: "2026-03-01T01:00:00Z",
    signalsGenerated: 5,
    tradesExecuted: 3,
    durationSeconds: 3600,
    regime: "trending",
    confidence: 85.5,
    ...overrides,
  };
}

function makeCycles(count: number): DisplayCycle[] {
  return Array.from({ length: count }, (_, i) =>
    makeCycle({ id: i + 1 })
  );
}

describe("CycleTable", () => {
  it("renders empty state when no cycles", () => {
    render(<CycleTable cycles={[]} />);
    expect(screen.getByText("No analysis cycles found")).toBeDefined();
    expect(screen.getByText("0 cycles")).toBeDefined();
  });

  it("renders table with cycle data", () => {
    const cycles = [makeCycle()];
    render(<CycleTable cycles={cycles} />);
    expect(screen.getByText("#1")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("Trending")).toBeDefined();
    expect(screen.getByText("85.5%")).toBeDefined();
  });

  it("displays cycle count", () => {
    const cycles = [makeCycle({ id: 1 }), makeCycle({ id: 2 })];
    render(<CycleTable cycles={cycles} />);
    expect(screen.getByText("2 cycles")).toBeDefined();
  });

  it("shows dash for null confidence", () => {
    const cycles = [makeCycle({ confidence: null })];
    render(<CycleTable cycles={cycles} />);
    // The confidence column should show "—"
    const table = screen.getByRole("table");
    expect(table.textContent).toContain("—");
  });

  it("shows dash for null start/end times", () => {
    const cycles = [makeCycle({ startTime: null, endTime: null })];
    render(<CycleTable cycles={cycles} />);
    const table = screen.getByRole("table");
    // Two dashes for start and end (plus potential other dashes)
    const content = table.textContent ?? "";
    expect(content.split("—").length).toBeGreaterThanOrEqual(3);
  });

  it("renders regime with correct label", () => {
    const cycles = [
      makeCycle({ id: 1, regime: "high_vol" }),
      makeCycle({ id: 2, regime: "ranging" }),
      makeCycle({ id: 3, regime: "no_data" }),
    ];
    render(<CycleTable cycles={cycles} />);
    expect(screen.getByText("High Vol")).toBeDefined();
    expect(screen.getByText("Ranging")).toBeDefined();
    expect(screen.getByText("No regime data")).toBeDefined();
  });

  it("does not show pagination for <= 25 cycles", () => {
    const cycles = makeCycles(10);
    render(<CycleTable cycles={cycles} />);
    expect(screen.queryByText("Prev")).toBeNull();
    expect(screen.queryByText("Next")).toBeNull();
  });

  it("shows pagination for > 25 cycles", () => {
    const cycles = makeCycles(30);
    render(<CycleTable cycles={cycles} />);
    expect(screen.getByText("Page 1 of 2")).toBeDefined();
    expect(screen.getByText("Prev")).toBeDefined();
    expect(screen.getByText("Next")).toBeDefined();
  });

  it("navigates to next page", () => {
    const cycles = makeCycles(30);
    render(<CycleTable cycles={cycles} />);
    const nextBtn = screen.getByText("Next");
    fireEvent.click(nextBtn);
    expect(screen.getByText("Page 2 of 2")).toBeDefined();
  });

  it("navigates back to previous page", () => {
    const cycles = makeCycles(30);
    render(<CycleTable cycles={cycles} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Prev"));
    expect(screen.getByText("Page 1 of 2")).toBeDefined();
  });

  it("disables Prev on first page", () => {
    const cycles = makeCycles(30);
    render(<CycleTable cycles={cycles} />);
    const prevBtn = screen.getByText("Prev");
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
  });

  it("disables Next on last page", () => {
    const cycles = makeCycles(30);
    render(<CycleTable cycles={cycles} />);
    fireEvent.click(screen.getByText("Next"));
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.hasAttribute("disabled")).toBe(true);
  });

  it("has accessible table with aria-label", () => {
    render(<CycleTable cycles={[makeCycle()]} />);
    const table = screen.getByRole("table");
    expect(table.getAttribute("aria-label")).toBe("Cycle table");
  });

  it("formats duration from seconds", () => {
    const cycles = [makeCycle({ durationSeconds: 7200 })];
    render(<CycleTable cycles={cycles} />);
    const table = screen.getByRole("table");
    expect(table.textContent).toContain("2h 0m");
  });
});
