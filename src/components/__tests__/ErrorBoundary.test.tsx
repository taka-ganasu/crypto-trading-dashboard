import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

afterEach(cleanup);

function ThrowingChild({ error }: { error: Error }) {
  throw error;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Hello World")).toBeDefined();
  });

  it("renders fallback UI when child throws", () => {
    // Suppress console.error from React's error boundary logging
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("Test error message")} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Test error message")).toBeDefined();

    spy.mockRestore();
  });

  it("shows reload button in error state", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("crash")} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Reload page")).toBeDefined();

    spy.mockRestore();
  });

  it("shows fallback message for error without message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("")} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    // Empty message falls back to the default text
    expect(screen.getByText("An unexpected error occurred.")).toBeDefined();

    spy.mockRestore();
  });

  it("calls window.location.reload when Reload button is clicked", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild error={new Error("crash")} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText("Reload page"));
    expect(reloadMock).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
