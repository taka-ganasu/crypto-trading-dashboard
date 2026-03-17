import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import DetailRow from "../DetailRow";

afterEach(cleanup);

describe("DetailRow", () => {
  it("renders label and value", () => {
    render(<DetailRow label="Price" value="$100.00" />);
    expect(screen.getByText("Price")).toBeDefined();
    expect(screen.getByText("$100.00")).toBeDefined();
  });

  it("renders numeric value as ReactNode", () => {
    render(<DetailRow label="Count" value={42} />);
    expect(screen.getByText("Count")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders JSX element as value", () => {
    render(
      <DetailRow
        label="Status"
        value={<span data-testid="badge">Active</span>}
      />
    );
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByTestId("badge")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("renders empty string value without crashing", () => {
    render(<DetailRow label="Empty" value="" />);
    expect(screen.getByText("Empty")).toBeDefined();
  });

  it("renders null value without crashing", () => {
    render(<DetailRow label="Null" value={null} />);
    expect(screen.getByText("Null")).toBeDefined();
  });
});
