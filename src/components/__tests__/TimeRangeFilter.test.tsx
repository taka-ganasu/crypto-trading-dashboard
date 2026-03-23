import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/test",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import TimeRangeFilter, { getTimeRangeDates, useTimeRange } from "../TimeRangeFilter";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-18T12:00:00Z"));
});

afterEach(() => {
  cleanup();
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

  it("24h points to range=24h", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByText("24h").getAttribute("href")).toBe("/test?range=24h");
  });

  it("30d points to range=30d", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByText("30d").getAttribute("href")).toBe("/test?range=30d");
  });

  it("90d points to range=90d", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByText("90d").getAttribute("href")).toBe("/test?range=90d");
  });

  it("All points to range=all", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByText("All").getAttribute("href")).toBe("/test?range=all");
  });

  it("7d points to the bare path", () => {
    render(<TimeRangeFilter />);
    expect(screen.getByText("7d").getAttribute("href")).toBe("/test");
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
