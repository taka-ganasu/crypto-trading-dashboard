import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ErrorPage from "../error";

afterEach(() => {
  cleanup();
});

function makeError(message: string): Error & { digest?: string } {
  return new Error(message) as Error & { digest?: string };
}

describe("Error page", () => {
  it("renders error heading", () => {
    render(<ErrorPage error={makeError("Test error")} reset={vi.fn()} />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Error")).toBeTruthy();
  });

  it("displays the error message", () => {
    render(
      <ErrorPage error={makeError("Database connection failed")} reset={vi.fn()} />
    );
    expect(screen.getByText("Database connection failed")).toBeTruthy();
  });

  it("shows fallback text when error.message is empty", () => {
    render(<ErrorPage error={makeError("")} reset={vi.fn()} />);
    expect(
      screen.getByText("An unexpected error occurred in the dashboard.")
    ).toBeTruthy();
  });

  it("calls reset when Retry button is clicked", () => {
    const reset = vi.fn();
    render(<ErrorPage error={makeError("Crash")} reset={reset} />);
    fireEvent.click(screen.getByText("Retry"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("logs error to console on mount", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = makeError("Logged error");
    render(<ErrorPage error={err} reset={vi.fn()} />);
    expect(consoleSpy).toHaveBeenCalledWith("[app/error]", err);
    consoleSpy.mockRestore();
  });
});
