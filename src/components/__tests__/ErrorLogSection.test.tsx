import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ErrorLogSection from "../system/ErrorLogSection";

afterEach(() => {
  cleanup();
});

describe("ErrorLogSection", () => {
  it("shows loading skeleton", () => {
    render(
      <ErrorLogSection
        loading={true}
        errorLogError={null}
        apiErrors={[]}
        expandedTraceKey={null}
        onToggleTrace={vi.fn()}
      />
    );
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error message when errorLogError set", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError="Timeout loading errors"
        apiErrors={[]}
        expandedTraceKey={null}
        onToggleTrace={vi.fn()}
      />
    );
    expect(screen.getByText("Failed to load API error logs.")).toBeTruthy();
    expect(screen.getByText("Timeout loading errors")).toBeTruthy();
  });

  it("shows empty state when no errors", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[]}
        expandedTraceKey={null}
        onToggleTrace={vi.fn()}
      />
    );
    expect(screen.getByText("No API errors found for the selected range.")).toBeTruthy();
  });

  it("renders error rows with correct data", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[
          {
            ts: "2026-03-15T10:00:00Z",
            status_code: 500,
            method: "GET",
            path: "/api/trades",
            detail: "Internal error",
            traceback: null,
            exc_type: null,
          },
          {
            ts: "2026-03-15T11:00:00Z",
            status_code: 404,
            method: "POST",
            path: "/api/signals",
            detail: "Not found",
            traceback: null,
            exc_type: null,
          },
        ]}
        expandedTraceKey={null}
        onToggleTrace={vi.fn()}
      />
    );
    const rows = screen.getAllByTestId("error-log-row");
    expect(rows.length).toBe(2);
    expect(screen.getByText("Internal error")).toBeTruthy();
    expect(screen.getByText("Not found")).toBeTruthy();
    expect(screen.getByText("GET")).toBeTruthy();
    expect(screen.getByText("POST")).toBeTruthy();
  });

  it("shows traceback toggle button when traceback exists", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[
          {
            ts: "2026-03-15T10:00:00Z",
            status_code: 500,
            method: "GET",
            path: "/api/trades",
            detail: "Crash",
            traceback: "Traceback (most recent call last)...",
            exc_type: "ValueError",
          },
        ]}
        expandedTraceKey={null}
        onToggleTrace={vi.fn()}
      />
    );
    expect(screen.getByText("Show traceback")).toBeTruthy();
  });

  it("calls onToggleTrace when traceback button clicked", () => {
    const onToggle = vi.fn();
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[
          {
            ts: "2026-03-15T10:00:00Z",
            status_code: 500,
            method: "GET",
            path: "/api/trades",
            detail: "Crash",
            traceback: "Error trace here",
            exc_type: null,
          },
        ]}
        expandedTraceKey={null}
        onToggleTrace={onToggle}
      />
    );
    const buttons = screen.getAllByText("Show traceback");
    fireEvent.click(buttons[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows expanded traceback content", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[
          {
            ts: "2026-03-15T10:00:00Z",
            status_code: 500,
            method: "GET",
            path: "/api/trades",
            detail: "Crash",
            traceback: "Full stack trace here",
            exc_type: "RuntimeError",
          },
        ]}
        expandedTraceKey="2026-03-15T10:00:00Z-/api/trades-0"
        onToggleTrace={vi.fn()}
      />
    );
    expect(screen.getByText("Hide traceback")).toBeTruthy();
    expect(screen.getByTestId("error-traceback")).toBeTruthy();
    expect(screen.getByText("Full stack trace here")).toBeTruthy();
    expect(screen.getByText("Exception: RuntimeError")).toBeTruthy();
  });

  it("renders dash for null fields", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[
          {
            ts: null as unknown as string,
            status_code: null as unknown as number,
            method: null as unknown as string,
            path: null as unknown as string,
            detail: null as unknown as string,
            traceback: null,
            exc_type: null,
          },
        ]}
        expandedTraceKey={null}
        onToggleTrace={vi.fn()}
      />
    );
    // Multiple "—" for null fields
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});
