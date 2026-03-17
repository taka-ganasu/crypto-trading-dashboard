import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HealthSection from "../system/HealthSection";

afterEach(() => {
  cleanup();
});

describe("HealthSection", () => {
  it("shows loading skeleton", () => {
    render(
      <HealthSection
        loading={true}
        systemError={null}
        status="OK"
        health={null}
        goLiveChecks={[]}
      />
    );
    // Pulse skeletons present in both status and go-live sections
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("shows system error message", () => {
    render(
      <HealthSection
        loading={false}
        systemError="Connection refused"
        status="DOWN"
        health={null}
        goLiveChecks={[]}
      />
    );
    expect(screen.getByText("Failed to load some system data")).toBeTruthy();
    expect(screen.getByText("Connection refused")).toBeTruthy();
  });

  it("shows OK status with connectivity info", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="OK"
        health={{ db_connected: true, exchange_connected: true, status: "OK" }}
        goLiveChecks={[]}
      />
    );
    expect(screen.getByText("OK")).toBeTruthy();
    expect(screen.getByText("All systems operational")).toBeTruthy();
    expect(screen.getAllByText("Connected").length).toBe(2);
  });

  it("shows DEGRADED status", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="DEGRADED"
        health={{ db_connected: true, exchange_connected: false, status: "DEGRADED" }}
        goLiveChecks={[]}
      />
    );
    expect(screen.getByText("DEGRADED")).toBeTruthy();
    expect(screen.getByText("Some services degraded")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Disconnected")).toBeTruthy();
  });

  it("shows unreachable status when health null", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="unreachable"
        health={null}
        goLiveChecks={[]}
      />
    );
    expect(screen.getByText("unreachable")).toBeTruthy();
  });

  it("renders go-live checks", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="OK"
        health={null}
        goLiveChecks={[
          { name: "Database", status: "ok", message: "Connected", latencyMs: 1.23 },
          { name: "Exchange", status: "warning", message: "Slow", latencyMs: 500.0 },
          { name: "Config", status: "error", message: "Missing key", latencyMs: null },
        ]}
      />
    );
    expect(screen.getByText("Database")).toBeTruthy();
    expect(screen.getByText("Exchange")).toBeTruthy();
    expect(screen.getByText("Config")).toBeTruthy();
    expect(screen.getByText("Latency: 1.23 ms")).toBeTruthy();
    expect(screen.getByText("Missing key")).toBeTruthy();
  });

  it("shows empty go-live message when no checks", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="OK"
        health={null}
        goLiveChecks={[]}
      />
    );
    expect(screen.getByText("No checks available from /api/health.")).toBeTruthy();
  });

  it("shows dash for null latency", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="OK"
        health={null}
        goLiveChecks={[
          { name: "Test", status: "unknown", message: "N/A", latencyMs: null },
        ]}
      />
    );
    const container = screen.getByTestId("go-live-checklist");
    expect(container.textContent).toContain("—");
  });
});
