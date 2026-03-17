import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MetricsSection from "../system/MetricsSection";

afterEach(() => {
  cleanup();
});

describe("MetricsSection", () => {
  it("shows loading skeleton", () => {
    render(<MetricsSection loading={true} metrics={null} />);
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("renders metrics when loaded", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={{
          memory_mb: 256.5,
          cpu_percent: 12.3,
          ws_connected: true,
          last_fr_fetch: "2026-03-15T10:00:00Z",
          open_positions: 3,
        }}
      />
    );
    expect(screen.getByText("Resource Metrics")).toBeTruthy();
    expect(screen.getByText("256.5")).toBeTruthy();
    expect(screen.getByText("12.3")).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows dashes for null metrics", () => {
    render(<MetricsSection loading={false} metrics={null} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows Disconnected for ws_connected=false", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={{
          memory_mb: 100,
          cpu_percent: 5,
          ws_connected: false,
          last_fr_fetch: null,
          open_positions: 0,
        }}
      />
    );
    expect(screen.getByText("Disconnected")).toBeTruthy();
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("shows Unknown for ws_connected=null", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={{
          memory_mb: null as unknown as number,
          cpu_percent: null as unknown as number,
          ws_connected: null as unknown as boolean,
          last_fr_fetch: null,
          open_positions: null as unknown as number,
        }}
      />
    );
    expect(screen.getByText("Unknown")).toBeTruthy();
  });
});
