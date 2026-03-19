import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/test",
}));

import ExecutionModeFilter, { useExecutionMode } from "../ExecutionModeFilter";

afterEach(() => {
  cleanup();
  pushMock.mockReset();
});

describe("ExecutionModeFilter", () => {
  it("renders all mode buttons", () => {
    render(<ExecutionModeFilter />);
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getByText("Live")).toBeDefined();
    expect(screen.getByText("Paper")).toBeDefined();
    expect(screen.getByText("Dry-run")).toBeDefined();
  });

  it("has group role and label", () => {
    render(<ExecutionModeFilter />);
    expect(screen.getByRole("group", { name: "Execution mode filter" })).toBeDefined();
  });

  it("defaults to Live as active", () => {
    render(<ExecutionModeFilter />);
    const liveBtn = screen.getByText("Live");
    expect(liveBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking All navigates with execution_mode=all", () => {
    render(<ExecutionModeFilter />);
    fireEvent.click(screen.getByText("All"));
    expect(pushMock).toHaveBeenCalledWith("/test?execution_mode=all");
  });

  it("clicking Paper navigates with execution_mode=paper", () => {
    render(<ExecutionModeFilter />);
    fireEvent.click(screen.getByText("Paper"));
    expect(pushMock).toHaveBeenCalledWith("/test?execution_mode=paper");
  });

  it("clicking Dry-run navigates with execution_mode=dry_run", () => {
    render(<ExecutionModeFilter />);
    fireEvent.click(screen.getByText("Dry-run"));
    expect(pushMock).toHaveBeenCalledWith("/test?execution_mode=dry_run");
  });

  it("clicking Live removes execution_mode param", () => {
    render(<ExecutionModeFilter />);
    fireEvent.click(screen.getByText("Live"));
    expect(pushMock).toHaveBeenCalledWith("/test");
  });
});

describe("useExecutionMode", () => {
  function TestHook() {
    const { executionMode, apiExecutionMode } = useExecutionMode();
    return (
      <div>
        <span data-testid="mode">{executionMode}</span>
        <span data-testid="api-mode">{String(apiExecutionMode)}</span>
      </div>
    );
  }

  it("defaults to live with undefined apiExecutionMode", () => {
    render(<TestHook />);
    expect(screen.getByTestId("mode").textContent).toBe("live");
    expect(screen.getByTestId("api-mode").textContent).toBe("live");
  });
});

describe("useExecutionMode with all param", () => {
  function TestHook() {
    const { executionMode, apiExecutionMode } = useExecutionMode();
    return (
      <div>
        <span data-testid="mode">{executionMode}</span>
        <span data-testid="api-mode">{String(apiExecutionMode)}</span>
      </div>
    );
  }

  it("returns undefined apiExecutionMode when mode is all", async () => {
    // Override mock for this test
    const mod = await import("next/navigation");
    vi.spyOn(mod, "useSearchParams").mockReturnValue(
      new URLSearchParams("execution_mode=all") as ReturnType<typeof mod.useSearchParams>
    );

    render(<TestHook />);
    expect(screen.getByTestId("mode").textContent).toBe("all");
    expect(screen.getByTestId("api-mode").textContent).toBe("undefined");

    vi.restoreAllMocks();
  });
});
