import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let searchParamsValue = "";
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/analysis",
}));

import TimeRangeFilter, { useTimeRange } from "../TimeRangeFilter";

function HookProbe() {
  const { range, start, end } = useTimeRange();
  return (
    <div>
      <span data-testid="range">{range}</span>
      <span data-testid="start">{start ?? "none"}</span>
      <span data-testid="end">{end ?? "none"}</span>
    </div>
  );
}

beforeEach(() => {
  searchParamsValue = "";
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-18T12:00:00Z"));
});

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  vi.useRealTimers();
});

describe("TimeRangeFilter query behavior", () => {
  it("preserves unrelated query params when switching to 30d", () => {
    searchParamsValue = "tab=signals&execution_mode=paper";

    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("30d"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const href = pushMock.mock.calls[0][0] as string;
    const [pathname, query = ""] = href.split("?");
    const params = new URLSearchParams(query);

    expect(pathname).toBe("/analysis");
    expect(params.get("tab")).toBe("signals");
    expect(params.get("execution_mode")).toBe("paper");
    expect(params.get("range")).toBe("30d");
  });

  it("removes only range when switching back to 7d", () => {
    searchParamsValue = "range=30d&tab=signals&execution_mode=paper";

    render(<TimeRangeFilter />);
    fireEvent.click(screen.getByText("7d"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const href = pushMock.mock.calls[0][0] as string;
    const [pathname, query = ""] = href.split("?");
    const params = new URLSearchParams(query);

    expect(pathname).toBe("/analysis");
    expect(params.get("tab")).toBe("signals");
    expect(params.get("execution_mode")).toBe("paper");
    expect(params.has("range")).toBe(false);
  });

  it("marks the current non-default range button as pressed", () => {
    searchParamsValue = "range=24h";

    render(<TimeRangeFilter />);

    expect(screen.getByText("24h").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("7d").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("useTimeRange edge cases", () => {
  it("returns the explicit 24h selection and bounded dates", () => {
    searchParamsValue = "range=24h";

    render(<HookProbe />);

    expect(screen.getByTestId("range").textContent).toBe("24h");
    expect(screen.getByTestId("start").textContent).toBe(
      "2026-03-17T12:00:00.000Z"
    );
    expect(screen.getByTestId("end").textContent).toBe(
      "2026-03-18T12:00:00.000Z"
    );
  });

  it("defaults invalid range values to 7d", () => {
    searchParamsValue = "range=custom";

    render(<HookProbe />);

    expect(screen.getByTestId("range").textContent).toBe("7d");
    expect(screen.getByTestId("start").textContent).toBe(
      "2026-03-11T12:00:00.000Z"
    );
    expect(screen.getByTestId("end").textContent).toBe(
      "2026-03-18T12:00:00.000Z"
    );
  });

  it("returns no dates for range=all", () => {
    searchParamsValue = "range=all";

    render(<HookProbe />);

    expect(screen.getByTestId("range").textContent).toBe("all");
    expect(screen.getByTestId("start").textContent).toBe("none");
    expect(screen.getByTestId("end").textContent).toBe("none");
  });
});
