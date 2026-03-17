import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import GlobalError from "../global-error";
import * as Sentry from "@sentry/nextjs";

afterEach(cleanup);

describe("GlobalError", () => {
  it("renders error message", () => {
    const error = new Error("Test error message");
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);
    expect(screen.getByText("Test error message")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders fallback for empty error message", () => {
    const error = new Error("");
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);
    expect(screen.getByText("An unexpected error occurred.")).toBeDefined();
  });

  it("calls Sentry.captureException on mount", () => {
    const error = new Error("sentry test");
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("calls reset when Try again is clicked", () => {
    const error = new Error("click test");
    const reset = vi.fn();
    render(<GlobalError error={error} reset={reset} />);
    const button = screen.getByText("Try again");
    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
