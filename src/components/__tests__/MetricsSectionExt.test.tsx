import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { SystemMetrics } from "@/types";
import MetricsSection from "../system/MetricsSection";

vi.mock("@/lib/format", async () => {
  return {
    formatTimestampVerbose: (value: string | null) =>
      value ? `VERBOSE:${value}` : "—",
  };
});

afterEach(cleanup);

function makeMetrics(overrides: Partial<SystemMetrics> = {}): SystemMetrics {
  return {
    memory_mb: 256.5,
    cpu_percent: 12.3,
    ws_connected: true,
    last_fr_fetch: "2026-03-15T10:00:00Z",
    open_positions: 3,
    ...overrides,
  };
}

describe("MetricsSection — formatOpenPositions edge cases", () => {
  it("shows dash for NaN open_positions", () => {
    render(<MetricsSection loading={false} metrics={makeMetrics({ open_positions: NaN })} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows dash for Infinity open_positions", () => {
    render(
      <MetricsSection loading={false} metrics={makeMetrics({ open_positions: Infinity })} />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 0 for open_positions of zero", () => {
    render(<MetricsSection loading={false} metrics={makeMetrics({ open_positions: 0 })} />);
    expect(screen.getByText("0")).toBeDefined();
  });

  it("shows large number for high open_positions", () => {
    render(<MetricsSection loading={false} metrics={makeMetrics({ open_positions: 999 })} />);
    expect(screen.getByText("999")).toBeDefined();
  });
});

describe("MetricsSection — WebSocket status dot styling", () => {
  it("has emerald dot when connected", () => {
    const { container } = render(
      <MetricsSection loading={false} metrics={makeMetrics({ ws_connected: true })} />
    );
    expect(container.querySelector(".bg-emerald-400")).not.toBeNull();
    expect(screen.getByText("Connected")).toBeDefined();
  });

  it("has red dot when disconnected", () => {
    const { container } = render(
      <MetricsSection loading={false} metrics={makeMetrics({ ws_connected: false })} />
    );
    expect(container.querySelector(".bg-red-400")).not.toBeNull();
    expect(screen.getByText("Disconnected")).toBeDefined();
  });

  it("has zinc dot when null (unknown)", () => {
    const { container } = render(
      <MetricsSection
        loading={false}
        metrics={makeMetrics({ ws_connected: null as unknown as boolean })}
      />
    );
    expect(container.querySelector(".bg-zinc-500")).not.toBeNull();
    expect(screen.getByText("Unknown")).toBeDefined();
  });

  it("has zinc dot when undefined (unknown)", () => {
    const { container } = render(
      <MetricsSection
        loading={false}
        metrics={makeMetrics({ ws_connected: undefined as unknown as boolean })}
      />
    );
    expect(container.querySelector(".bg-zinc-500")).not.toBeNull();
    expect(screen.getByText("Unknown")).toBeDefined();
  });
});

describe("MetricsSection — memory and CPU display", () => {
  it("formats memory_mb to one decimal place", () => {
    render(<MetricsSection loading={false} metrics={makeMetrics({ memory_mb: 1024.789 })} />);
    expect(screen.getByText("1024.8")).toBeDefined();
  });

  it("formats cpu_percent to one decimal place", () => {
    render(<MetricsSection loading={false} metrics={makeMetrics({ cpu_percent: 99.99 })} />);
    expect(screen.getByText("100.0")).toBeDefined();
  });

  it("shows dash for null memory_mb", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={makeMetrics({ memory_mb: null as unknown as number })}
      />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows dash for null cpu_percent", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={makeMetrics({ cpu_percent: null as unknown as number })}
      />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

describe("MetricsSection — last FR fetch display", () => {
  it("formats timestamp through formatTimestampVerbose", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={makeMetrics({ last_fr_fetch: "2026-03-18T12:00:00Z" })}
      />
    );
    expect(screen.getByText("VERBOSE:2026-03-18T12:00:00Z")).toBeDefined();
  });

  it("shows dash for null last_fr_fetch", () => {
    render(
      <MetricsSection loading={false} metrics={makeMetrics({ last_fr_fetch: null })} />
    );
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});

describe("MetricsSection — loading state", () => {
  it("shows exactly 5 skeleton cards when loading", () => {
    const { container } = render(<MetricsSection loading={true} metrics={null} />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(5);
  });

  it("does not show skeleton when loaded", () => {
    const { container } = render(
      <MetricsSection loading={false} metrics={makeMetrics()} />
    );
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(0);
  });
});
