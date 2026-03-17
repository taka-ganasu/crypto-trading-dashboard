import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/test",
}));

import TimeRangeFilter, { getTimeRangeDates, useTimeRange } from "../TimeRangeFilter";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-18T12:00:00Z"));
});

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  vi.useRealTimers();
});

describe("TimeRangeFilter", () => {
  it("renders all range buttons", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByText("24h")).toBeDefined();
    expect(screen.getByText("7d")).toBeDefined();
    expect(screen.getByText("30d")).toBeDefined();
    expect(screen.getByText("90d")).toBeDefined();
    expect(screen.getByText("All")).toBeDefined();
  });

  it("has group role and label", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByRole("group", { name: "Time range filter" })).toBeDefined();
  });

  it("defaults to 7d as active", () => {
    render(<TimeRangeFilter />);
    const btn = screen.getByText("7d");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking 24h navigates with range=24h", () => {
    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("24h"));
    expect(pushMock).toHaveBeenCalledWith("/test?range=24h");
  });

  it("clicking 30d navigates with range=30d", () => {
    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("30d"));
    expect(pushMock).toHaveBeenCalledWith("/test?range=30d");
  });

  it("clicking 90d navigates with range=90d", () => {
    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("90d"));
    expect(pushMock).toHaveBeenCalledWith("/test?range=90d");
  });

  it("clicking All navigates with range=all", () => {
    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("All"));
    expect(pushMock).toHaveBeenCalledWith("/test?range=all");
  });

  it("clicking 7d removes range param (default)", () => {
    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("7d"));
    expect(pushMock).toHaveBeenCalledWith("/test");
  });
});

describe("getTimeRangeDates", () => {
  it("returns start/end for 24h", () => {
    const { start, end } = getTimeRangeDates("24h");
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    const diff = new Date(end!).getTime() - new Date(start!).getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it("returns start/end for 7d", () => {
    const { start, end } = getTimeRangeDates("7d");
    const diff = new Date(end!).getTime() - new Date(start!).getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("returns empty for all", () => {
    const result = getTimeRangeDates("all");
    expect(result.start).toBeUndefined();
    expect(result.end).toBeUndefined();
  });
});

describe("useTimeRange", () => {
  function TestHook() {
    const { range, start, end } = useTimeRange();
    return (
      <div>
        <span data-testid="range">{range}</span>
        <span data-testid="start">{start ?? "none"}</span>
        <span data-testid="end">{end ?? "none"}</span>
      </div>
    );
  }

  it("defaults to 7d", () => {
    render(<TestHook />);
    expect(screen.getByTestId("range").textContent).toBe("7d");
    expect(screen.getByTestId("start").textContent).not.toBe("none");
    expect(screen.getByTestId("end").textContent).not.toBe("none");
  });
});
