import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SystemStatusWidget from "../SystemStatusWidget";

afterEach(() => {
  cleanup();
});

describe("SystemStatusWidget", () => {
  it("shows loading skeleton", () => {
    render(
      <SystemStatusWidget health={null} loading={true} error={null} />
    );
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Bot Status")).toBeTruthy();
  });

  it("shows healthy status for OK health", () => {
    render(
      <SystemStatusWidget
        health={{ status: "ok" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe("healthy");
    expect(screen.getByText("Auto refresh: every 30s")).toBeTruthy();
  });

  it("shows healthy for running status", () => {
    render(
      <SystemStatusWidget
        health={{ status: "running" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe("healthy");
  });

  it("shows degraded status for warning", () => {
    render(
      <SystemStatusWidget
        health={{ status: "warning" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe("degraded");
  });

  it("shows unhealthy status for down", () => {
    render(
      <SystemStatusWidget
        health={{ status: "down" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe(
      "unhealthy"
    );
  });

  it("shows unknown status for null health", () => {
    render(
      <SystemStatusWidget health={null} loading={false} error={null} />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe("unknown");
  });

  it("shows unknown for unrecognized status string", () => {
    render(
      <SystemStatusWidget
        health={{ status: "something-else" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe("unknown");
  });

  it("falls back to health field when status is missing", () => {
    render(
      <SystemStatusWidget
        health={{ health: "ok" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe("healthy");
  });

  it("falls back to state field", () => {
    render(
      <SystemStatusWidget
        health={{ state: "critical" }}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByTestId("bot-status-value").textContent).toBe(
      "unhealthy"
    );
  });

  it("shows error message instead of auto-refresh", () => {
    render(
      <SystemStatusWidget
        health={{ status: "ok" }}
        loading={false}
        error="Connection failed"
      />
    );
    expect(screen.getByText("Connection failed")).toBeTruthy();
    expect(screen.queryByText("Auto refresh: every 30s")).toBeNull();
  });
});
