/**
 * Extended HealthSection tests.
 *
 * Covers: STATUS_CONFIG styling per status, GO_LIVE_STATUS_CONFIG
 * label/color per check status, formatConnectivity edge cases,
 * loading skeleton count, latency edge cases, error priority.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import HealthSection from "../system/HealthSection";

afterEach(cleanup);

const baseProps = {
  loading: false,
  systemError: null,
  status: "OK" as const,
  health: null,
  goLiveChecks: [] as {
    name: string;
    status: "ok" | "warning" | "error" | "unknown";
    message: string;
    latencyMs: number | null;
  }[],
};

/* ------------------------------------------------------------------ */
/* STATUS_CONFIG — each status renders correct badge and label         */
/* ------------------------------------------------------------------ */

describe("HealthSection — STATUS_CONFIG styling", () => {
  it("OK status renders emerald badge and 'All systems operational'", () => {
    const { container } = render(
      <HealthSection
        {...baseProps}
        status="OK"
        health={{ db_connected: true, exchange_connected: true, status: "OK" }}
      />
    );
    expect(screen.getByText("OK")).toBeDefined();
    expect(screen.getByText("All systems operational")).toBeDefined();
    expect(container.querySelector(".text-emerald-400")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-400")).not.toBeNull();
  });

  it("DEGRADED status renders yellow badge and 'Some services degraded'", () => {
    const { container } = render(
      <HealthSection
        {...baseProps}
        status="DEGRADED"
        health={{ db_connected: true, exchange_connected: false, status: "DEGRADED" }}
      />
    );
    expect(screen.getByText("DEGRADED")).toBeDefined();
    expect(screen.getByText("Some services degraded")).toBeDefined();
    expect(container.querySelector(".text-yellow-400")).not.toBeNull();
    expect(container.querySelector(".bg-yellow-400")).not.toBeNull();
  });

  it("DOWN status renders red badge and 'System is down'", () => {
    const { container } = render(
      <HealthSection
        {...baseProps}
        status="DOWN"
        health={{ db_connected: false, exchange_connected: false, status: "DOWN" }}
      />
    );
    expect(screen.getByText("DOWN")).toBeDefined();
    expect(screen.getByText("System is down")).toBeDefined();
    expect(container.querySelector(".text-red-400")).not.toBeNull();
    expect(container.querySelector(".bg-red-400")).not.toBeNull();
  });

  it("unreachable status renders zinc badge and API-only label", () => {
    const { container } = render(
      <HealthSection {...baseProps} status="unreachable" />
    );
    expect(screen.getByText("unreachable")).toBeDefined();
    expect(
      screen.getByText("Health monitor not running (API-only mode)")
    ).toBeDefined();
    expect(container.querySelector(".text-zinc-400")).not.toBeNull();
    expect(container.querySelector(".bg-zinc-400")).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* GO_LIVE_STATUS_CONFIG — label and color per check status            */
/* ------------------------------------------------------------------ */

describe("HealthSection — GO_LIVE_STATUS_CONFIG labels", () => {
  it("'ok' check renders 'OK' label with emerald styling", () => {
    const { container } = render(
      <HealthSection
        {...baseProps}
        status="OK"
        goLiveChecks={[
          { name: "DB Check", status: "ok", message: "Up", latencyMs: 5 },
        ]}
      />
    );
    const checklist = screen.getByTestId("go-live-checklist");
    expect(within(checklist).getByText("OK")).toBeDefined();
    expect(within(checklist).getByText("DB Check")).toBeDefined();
    expect(checklist.querySelector(".text-emerald-300")).not.toBeNull();
    expect(checklist.querySelector(".bg-emerald-400")).not.toBeNull();
  });

  it("'warning' check renders 'Warning' label with yellow styling", () => {
    render(
      <HealthSection
        {...baseProps}
        status="OK"
        goLiveChecks={[
          { name: "Latency", status: "warning", message: "Slow", latencyMs: 300 },
        ]}
      />
    );
    const checklist = screen.getByTestId("go-live-checklist");
    expect(within(checklist).getByText("Warning")).toBeDefined();
    expect(checklist.querySelector(".text-yellow-300")).not.toBeNull();
    expect(checklist.querySelector(".bg-yellow-400")).not.toBeNull();
  });

  it("'error' check renders 'Error' label with red styling", () => {
    render(
      <HealthSection
        {...baseProps}
        status="OK"
        goLiveChecks={[
          { name: "Config", status: "error", message: "Missing", latencyMs: null },
        ]}
      />
    );
    const checklist = screen.getByTestId("go-live-checklist");
    expect(within(checklist).getByText("Error")).toBeDefined();
    expect(checklist.querySelector(".text-red-300")).not.toBeNull();
    expect(checklist.querySelector(".bg-red-400")).not.toBeNull();
  });

  it("'unknown' check renders 'Unknown' label with zinc styling", () => {
    render(
      <HealthSection
        {...baseProps}
        status="OK"
        goLiveChecks={[
          { name: "Feature", status: "unknown", message: "N/A", latencyMs: null },
        ]}
      />
    );
    const checklist = screen.getByTestId("go-live-checklist");
    expect(within(checklist).getByText("Unknown")).toBeDefined();
    expect(checklist.querySelector(".text-zinc-300")).not.toBeNull();
    expect(checklist.querySelector(".bg-zinc-400")).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* formatConnectivity — edge cases for null/undefined                  */
/* ------------------------------------------------------------------ */

describe("HealthSection — connectivity display", () => {
  it("shows '—' for both DB and Exchange when health is null", () => {
    render(<HealthSection {...baseProps} status="unreachable" health={null} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(2);
  });

  it("shows 'Disconnected' for false values", () => {
    render(
      <HealthSection
        {...baseProps}
        status="DOWN"
        health={{ db_connected: false, exchange_connected: false, status: "DOWN" }}
      />
    );
    expect(screen.getAllByText("Disconnected").length).toBe(2);
  });

  it("shows mixed Connected/Disconnected", () => {
    render(
      <HealthSection
        {...baseProps}
        status="DEGRADED"
        health={{ db_connected: true, exchange_connected: false, status: "DEGRADED" }}
      />
    );
    expect(screen.getByText("Connected")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Loading skeleton and latency formatting                             */
/* ------------------------------------------------------------------ */

describe("HealthSection — loading and latency", () => {
  it("loading state shows 4 go-live skeleton items", () => {
    render(
      <HealthSection
        {...baseProps}
        loading={true}
        goLiveChecks={[]}
      />
    );
    const checklist = screen.getByTestId("go-live-checklist");
    const pulses = checklist.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(4);
  });

  it("latencyMs=0 renders '0.00 ms'", () => {
    render(
      <HealthSection
        {...baseProps}
        status="OK"
        goLiveChecks={[
          { name: "Fast", status: "ok", message: "OK", latencyMs: 0 },
        ]}
      />
    );
    expect(screen.getByText("Latency: 0.00 ms")).toBeDefined();
  });

  it("high latency renders with 2 decimal places", () => {
    render(
      <HealthSection
        {...baseProps}
        status="OK"
        goLiveChecks={[
          { name: "Slow", status: "warning", message: "High", latencyMs: 1234.567 },
        ]}
      />
    );
    expect(screen.getByText("Latency: 1234.57 ms")).toBeDefined();
  });

  it("systemError hides status badge and shows error instead", () => {
    render(
      <HealthSection
        {...baseProps}
        systemError="Network timeout"
        status="OK"
      />
    );
    expect(screen.getByText("Failed to load some system data")).toBeDefined();
    expect(screen.getByText("Network timeout")).toBeDefined();
    expect(screen.queryByText("All systems operational")).toBeNull();
  });
});
