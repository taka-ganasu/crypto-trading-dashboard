import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ApiError, SystemHealth, SystemInfo, SystemMetrics } from "@/types";
import HealthSection from "../system/HealthSection";
import ConfigSection from "../system/ConfigSection";
import MetricsSection from "../system/MetricsSection";
import ErrorLogSection from "../system/ErrorLogSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseHealth: SystemHealth = {
  status: "ok",
  db_connected: true,
  exchange_connected: false,
};

const baseMetrics: SystemMetrics = {
  memory_mb: 123.4,
  cpu_percent: 56.7,
  ws_connected: false,
  last_fr_fetch: "2026-03-18T00:00:00Z",
  open_positions: 3,
};

const baseInfo: SystemInfo = {
  db_path: "/srv/data/trades.db",
  api_version: "1.2.3",
  bot_version: "2.0.0",
  python_version: "3.12.0",
  platform: "Linux",
};

const apiErrors: ApiError[] = [
  {
    ts: "2026-03-18T00:00:00Z",
    status_code: 500,
    method: "get",
    path: "/api/health",
    detail: "server blew up",
    exc_type: "ValueError",
    traceback: "traceback 500",
  },
  {
    ts: "2026-03-18T00:05:00Z",
    status_code: 404,
    method: "post",
    path: "/api/unknown",
    detail: "not found",
    exc_type: null,
    traceback: null,
  },
  {
    ts: "bad-date",
    status_code: null as unknown as number,
    method: "",
    path: "",
    detail: "",
    exc_type: null,
    traceback: "traceback 0",
  },
];

describe("HealthSection", () => {
  it("renders loading placeholders", () => {
    const { container } = render(
      <HealthSection
        loading
        systemError={null}
        status="OK"
        health={null}
        goLiveChecks={[]}
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(5);
  });

  it("renders system error details", () => {
    render(
      <HealthSection
        loading={false}
        systemError="metrics unavailable"
        status="DEGRADED"
        health={null}
        goLiveChecks={[]}
      />
    );

    expect(screen.getByText("Failed to load some system data")).toBeDefined();
    expect(screen.getByText("metrics unavailable")).toBeDefined();
    expect(screen.getByText("No checks available from /api/health.")).toBeDefined();
  });

  it("renders status, connectivity, and go-live checks", () => {
    render(
      <HealthSection
        loading={false}
        systemError={null}
        status="unreachable"
        health={baseHealth}
        goLiveChecks={[
          {
            name: "exchange",
            status: "warning",
            message: "slow response",
            latencyMs: 321.987,
          },
          {
            name: "db",
            status: "ok",
            message: "connected",
            latencyMs: null,
          },
        ]}
      />
    );

    expect(screen.getByText("unreachable")).toBeDefined();
    expect(screen.getByText("Health monitor not running (API-only mode)")).toBeDefined();
    expect(screen.getByText("Connected")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText("Warning")).toBeDefined();
    expect(screen.getByText("OK")).toBeDefined();
    expect(screen.getByText("Latency: 321.99 ms")).toBeDefined();
    expect(screen.getAllByText("Latency: —").length).toBeGreaterThanOrEqual(1);
  });
});

describe("ConfigSection", () => {
  it("renders loading placeholders", () => {
    const { container } = render(
      <ConfigSection
        loading
        botVersionFromHealth={null}
        vpsHead={null}
        mainHead={null}
        isHeadDrift={false}
        info={null}
        dashboardVersion="0.2.0"
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(7);
  });

  it("renders drift warning and populated config values", () => {
    render(
      <ConfigSection
        loading={false}
        botVersionFromHealth="bot-health-1"
        vpsHead="abc123"
        mainHead="def456"
        isHeadDrift
        info={baseInfo}
        dashboardVersion="0.2.0"
      />
    );

    expect(screen.getByTestId("head-sync-status").textContent).toBe("DRIFT");
    expect(screen.getByText("Warning: VPS HEAD differs from main HEAD.")).toBeDefined();
    expect(screen.getByTestId("vps-bot-version-value").textContent).toBe("bot-health-1");
    expect(screen.getByTestId("api-version-value").textContent).toBe("1.2.3");
    expect(screen.getByTestId("dashboard-version-value").textContent).toBe("0.2.0");
    expect(screen.getByText("/srv/data/trades.db")).toBeDefined();
  });

  it("renders unknown sync status and fallbacks when values are missing", () => {
    render(
      <ConfigSection
        loading={false}
        botVersionFromHealth={null}
        vpsHead={null}
        mainHead={null}
        isHeadDrift={false}
        info={null}
        dashboardVersion="0.2.0"
      />
    );

    expect(screen.getByTestId("head-sync-status").textContent).toBe("UNKNOWN");
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});

describe("MetricsSection", () => {
  it("renders loading placeholders", () => {
    const { container } = render(<MetricsSection loading metrics={null} />);

    expect(container.querySelectorAll(".animate-pulse").length).toBe(5);
  });

  it("renders metrics values and disconnected websocket state", () => {
    const timeSpy = vi
      .spyOn(Date.prototype, "toLocaleString")
      .mockReturnValue("Mar 18, 12:00:00");

    render(<MetricsSection loading={false} metrics={baseMetrics} />);

    expect(screen.getByText("123.4")).toBeDefined();
    expect(screen.getByText("56.7")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.getByText("Mar 18, 12:00:00")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();

    timeSpy.mockRestore();
  });

  it("renders fallbacks for unknown websocket state and invalid values", () => {
    render(
      <MetricsSection
        loading={false}
        metrics={{
          memory_mb: null,
          cpu_percent: null,
          ws_connected: null,
          last_fr_fetch: "not-a-date",
          open_positions: null,
        }}
      />
    );

    expect(screen.getByText("Unknown")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
  });
});

describe("ErrorLogSection", () => {
  it("renders loading placeholders", () => {
    const { container } = render(
      <ErrorLogSection
        loading
        errorLogError={null}
        apiErrors={[]}
        expandedTraceKey={null}
        onToggleTrace={() => {}}
      />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBe(5);
  });

  it("renders fetch error state", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError="api unavailable"
        apiErrors={[]}
        expandedTraceKey={null}
        onToggleTrace={() => {}}
      />
    );

    expect(screen.getByText("Failed to load API error logs.")).toBeDefined();
    expect(screen.getByText("api unavailable")).toBeDefined();
  });

  it("renders empty state", () => {
    render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={[]}
        expandedTraceKey={null}
        onToggleTrace={() => {}}
      />
    );

    expect(screen.getByText("No API errors found for the selected range.")).toBeDefined();
  });

  it("renders rows with severity styles and toggles traceback", () => {
    const toggleTrace = vi.fn();
    const timeSpy = vi
      .spyOn(Date.prototype, "toLocaleString")
      .mockReturnValue("Mar 18, 12:00:00");

    const { container } = render(
      <ErrorLogSection
        loading={false}
        errorLogError={null}
        apiErrors={apiErrors}
        expandedTraceKey="2026-03-18T00:00:00Z-/api/health-0"
        onToggleTrace={toggleTrace}
      />
    );

    expect(screen.getByTestId("error-log-table")).toBeDefined();
    expect(screen.getAllByTestId("error-log-row").length).toBe(3);
    expect(container.querySelector(".bg-red-500\\/10")).not.toBeNull();
    expect(container.querySelector(".bg-yellow-500\\/10")).not.toBeNull();
    expect(container.querySelector(".bg-zinc-900\\/40")).not.toBeNull();
    expect(screen.getByText("500")).toBeDefined();
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("error-traceback").textContent).toContain("traceback 500");

    fireEvent.click(screen.getByRole("button", { name: "Show traceback" }));
    expect(toggleTrace).toHaveBeenCalledWith("bad-date--2");

    timeSpy.mockRestore();
  });
});
