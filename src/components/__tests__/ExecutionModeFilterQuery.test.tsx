import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let searchParamsValue = "";
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/system",
}));

import ExecutionModeFilter, { useExecutionMode } from "../ExecutionModeFilter";

function HookProbe() {
  const { executionMode, apiExecutionMode } = useExecutionMode();
  return (
    <div>
      <span data-testid="execution-mode">{executionMode}</span>
      <span data-testid="api-execution-mode">{String(apiExecutionMode)}</span>
    </div>
  );
}

beforeEach(() => {
  searchParamsValue = "";
});

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

describe("ExecutionModeFilter query behavior", () => {
  it("preserves unrelated query params when switching to paper mode", () => {
    searchParamsValue = "tab=mdse&limit=50";

    render(<ExecutionModeFilter />);
    fireEvent.click(screen.getByText("Paper"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const href = pushMock.mock.calls[0][0] as string;
    const [pathname, query = ""] = href.split("?");
    const params = new URLSearchParams(query);

    expect(pathname).toBe("/system");
    expect(params.get("tab")).toBe("mdse");
    expect(params.get("limit")).toBe("50");
    expect(params.get("execution_mode")).toBe("paper");
  });

  it("removes only execution_mode when switching back to live", () => {
    searchParamsValue = "execution_mode=paper&tab=mdse&limit=50";

    render(<ExecutionModeFilter />);
    fireEvent.click(screen.getByText("Live"));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const href = pushMock.mock.calls[0][0] as string;
    const [pathname, query = ""] = href.split("?");
    const params = new URLSearchParams(query);

    expect(pathname).toBe("/system");
    expect(params.get("tab")).toBe("mdse");
    expect(params.get("limit")).toBe("50");
    expect(params.has("execution_mode")).toBe(false);
  });

  it("marks the current non-default mode button as pressed", () => {
    searchParamsValue = "execution_mode=paper";

    render(<ExecutionModeFilter />);

    expect(screen.getByText("Paper").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Live").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("useExecutionMode edge cases", () => {
  it("defaults invalid execution_mode values to live", () => {
    searchParamsValue = "execution_mode=shadow";

    render(<HookProbe />);

    expect(screen.getByTestId("execution-mode").textContent).toBe("live");
    expect(screen.getByTestId("api-execution-mode").textContent).toBe("live");
  });

  it("returns paper for both UI and API mode when execution_mode=paper", () => {
    searchParamsValue = "execution_mode=paper";

    render(<HookProbe />);

    expect(screen.getByTestId("execution-mode").textContent).toBe("paper");
    expect(screen.getByTestId("api-execution-mode").textContent).toBe("paper");
  });
});
