import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import LoadingSpinner from "../LoadingSpinner";

afterEach(cleanup);

describe("LoadingSpinner", () => {
  it("renders with default label", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("Loading content...")).toBeDefined();
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("renders with custom label", () => {
    render(<LoadingSpinner label="Loading trades..." />);
    expect(screen.getByText("Loading trades...")).toBeDefined();
  });

  it("has aria-label for accessibility", () => {
    render(<LoadingSpinner label="Fetching data" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toBe("Fetching data");
  });

  it("has aria-live polite attribute", () => {
    render(<LoadingSpinner />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });
});
