import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchBotHealth: vi.fn(),
  fetchJSON: vi.fn(),
  fetchSystemHealth: vi.fn(),
  fetchSystemInfo: vi.fn(),
  fetchSystemMetrics: vi.fn(),
}));

import {
  fetchBotHealth,
  fetchJSON,
  fetchSystemHealth,
  fetchSystemInfo,
  fetchSystemMetrics,
} from "@/lib/api";
import type { ApiError, BotHealthResponse, SystemHealth, SystemInfo, SystemMetrics } from "@/types";
import { useSystemData } from "../useSystemData";

const health: SystemHealth = {
  status: "ok",
  uptime_seconds: 3600,
  pid: 42,
};

const metrics: SystemMetrics = {
  memory_mb: 256,
  cpu_percent: 15.5,
  ws_connected: true,
  last_fr_fetch: "2026-03-24T11:55:00Z",
  open_positions: 2,
};

const info: SystemInfo = {
  db_path: "/tmp/trades.db",
  api_version: "1.0.0",
  bot_version: "0.2.0",
  python_version: "3.12.0",
  platform: "linux",
};

const apiErrors: ApiError[] = [
  {
    ts: "2026-03-24T11:00:00Z",
    status_code: 500,
    method: "GET",
    path: "/api/system/health",
    detail: "Internal Server Error",
    exc_type: "RuntimeError",
    traceback: "Traceback...",
  },
];

const nestedBotHealth: BotHealthResponse = {
  data: {
    app_version: "1.2.3",
    vps_commit: "abc123",
    origin_main_head: "def456",
    checks: [
      { name: "db", status: "ok", message: "Connected", latency_ms: 5 },
      { name: "exchange", status: "warning", message: "Slow", latency_ms: 120 },
    ],
  },
};

function Probe() {
  const data = useSystemData();

  return (
    <div>
      <div data-testid="loading">{String(data.loading)}</div>
      <div data-testid="status">{data.status}</div>
      <div data-testid="health">{data.health ? "loaded" : "none"}</div>
      <div data-testid="metrics">{data.metrics ? "loaded" : "none"}</div>
      <div data-testid="info">{data.info ? "loaded" : "none"}</div>
      <div data-testid="system-error">{data.systemError ?? "none"}</div>
      <div data-testid="error-log-error">{data.errorLogError ?? "none"}</div>
      <div data-testid="api-errors">{String(data.apiErrors.length)}</div>
      <div data-testid="bot-version">{data.botVersionFromHealth ?? "none"}</div>
      <div data-testid="vps-head">{data.vpsHead ?? "none"}</div>
      <div data-testid="main-head">{data.mainHead ?? "none"}</div>
      <div data-testid="head-drift">{String(data.isHeadDrift)}</div>
      <div data-testid="go-live-checks">{String(data.goLiveChecks.length)}</div>
      <div data-testid="active-tab">{data.activeTab}</div>
      <div data-testid="expanded-trace">{data.expandedTraceKey ?? "none"}</div>
      <button type="button" onClick={() => data.setActiveTab("errors")}>
        Errors tab
      </button>
      <button type="button" onClick={() => data.setActiveTab("info")}>
        Info tab
      </button>
      <button type="button" onClick={() => data.toggleTrace("trace-1")}>
        Toggle trace
      </button>
    </div>
  );
}

function setupSuccessfulMocks(botHealth: BotHealthResponse = nestedBotHealth) {
  vi.mocked(fetchSystemHealth).mockResolvedValue(health);
  vi.mocked(fetchSystemMetrics).mockResolvedValue(metrics);
  vi.mocked(fetchSystemInfo).mockResolvedValue(info);
  vi.mocked(fetchBotHealth).mockResolvedValue(botHealth);
  vi.mocked(fetchJSON).mockResolvedValue(apiErrors);
}

async function waitForLoadedState() {
  await waitFor(() => {
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
}

describe("useSystemData", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads successful system data and exposes derived health fields", async () => {
    setupSuccessfulMocks();

    render(<Probe />);
    await waitForLoadedState();

    expect(screen.getByTestId("status").textContent).toBe("OK");
    expect(screen.getByTestId("health").textContent).toBe("loaded");
    expect(screen.getByTestId("metrics").textContent).toBe("loaded");
    expect(screen.getByTestId("info").textContent).toBe("loaded");
    expect(screen.getByTestId("api-errors").textContent).toBe("1");
    expect(screen.getByTestId("system-error").textContent).toBe("none");
    expect(screen.getByTestId("error-log-error").textContent).toBe("none");
    expect(screen.getByTestId("bot-version").textContent).toBe("1.2.3");
    expect(screen.getByTestId("vps-head").textContent).toBe("abc123");
    expect(screen.getByTestId("main-head").textContent).toBe("def456");
    expect(screen.getByTestId("head-drift").textContent).toBe("true");
    expect(screen.getByTestId("go-live-checks").textContent).toBe("2");
    expect(fetchJSON).toHaveBeenCalledWith(
      "/errors?since=2026-03-23T12%3A00%3A00.000Z&status_gte=400&limit=50",
      expect.objectContaining({ mapResponse: expect.any(Function) })
    );
  });

  it("records which system API calls failed", async () => {
    vi.mocked(fetchSystemHealth).mockRejectedValue(new Error("health down"));
    vi.mocked(fetchSystemMetrics).mockResolvedValue(metrics);
    vi.mocked(fetchSystemInfo).mockRejectedValue(new Error("info down"));
    vi.mocked(fetchBotHealth).mockResolvedValue(nestedBotHealth);
    vi.mocked(fetchJSON).mockResolvedValue(apiErrors);

    render(<Probe />);
    await waitForLoadedState();

    expect(screen.getByTestId("health").textContent).toBe("none");
    expect(screen.getByTestId("metrics").textContent).toBe("loaded");
    expect(screen.getByTestId("info").textContent).toBe("none");
    expect(screen.getByTestId("system-error").textContent).toBe(
      "Failed to fetch: health, info"
    );
  });

  it("stores an error log failure separately from the system error", async () => {
    setupSuccessfulMocks();
    vi.mocked(fetchJSON).mockRejectedValue(new Error("error logs unavailable"));

    render(<Probe />);
    await waitForLoadedState();

    expect(screen.getByTestId("api-errors").textContent).toBe("0");
    expect(screen.getByTestId("error-log-error").textContent).toBe(
      "error logs unavailable"
    );
    expect(screen.getByTestId("system-error").textContent).toBe("none");
  });

  it("starts on the info tab and allows switching tabs", async () => {
    setupSuccessfulMocks();

    render(<Probe />);
    await waitForLoadedState();

    expect(screen.getByTestId("active-tab").textContent).toBe("info");

    fireEvent.click(screen.getByRole("button", { name: "Errors tab" }));
    expect(screen.getByTestId("active-tab").textContent).toBe("errors");

    fireEvent.click(screen.getByRole("button", { name: "Info tab" }));
    expect(screen.getByTestId("active-tab").textContent).toBe("info");
  });

  it("toggles an expanded trace key on and off", async () => {
    setupSuccessfulMocks();

    render(<Probe />);
    await waitForLoadedState();

    expect(screen.getByTestId("expanded-trace").textContent).toBe("none");

    fireEvent.click(screen.getByRole("button", { name: "Toggle trace" }));
    expect(screen.getByTestId("expanded-trace").textContent).toBe("trace-1");

    fireEvent.click(screen.getByRole("button", { name: "Toggle trace" }));
    expect(screen.getByTestId("expanded-trace").textContent).toBe("none");
  });

  it("refreshes system data every 30 seconds", async () => {
    setupSuccessfulMocks();

    render(<Probe />);
    await waitForLoadedState();

    const initialHealthCalls = vi.mocked(fetchSystemHealth).mock.calls.length;
    const initialMetricsCalls = vi.mocked(fetchSystemMetrics).mock.calls.length;
    const initialInfoCalls = vi.mocked(fetchSystemInfo).mock.calls.length;
    const initialBotHealthCalls = vi.mocked(fetchBotHealth).mock.calls.length;
    const initialErrorCalls = vi.mocked(fetchJSON).mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(vi.mocked(fetchSystemHealth).mock.calls.length).toBeGreaterThan(
        initialHealthCalls
      );
    });

    expect(vi.mocked(fetchSystemMetrics).mock.calls.length).toBeGreaterThan(
      initialMetricsCalls
    );
    expect(vi.mocked(fetchSystemInfo).mock.calls.length).toBeGreaterThan(
      initialInfoCalls
    );
    expect(vi.mocked(fetchBotHealth).mock.calls.length).toBeGreaterThan(
      initialBotHealthCalls
    );
    expect(vi.mocked(fetchJSON).mock.calls.length).toBeGreaterThan(
      initialErrorCalls
    );
  });

  it("derives root-level bot health fields and reports no drift when main head is absent", async () => {
    setupSuccessfulMocks({
      version: "2.0.0",
      checks: [{ name: "db", status: "ok", message: "Connected", latency_ms: 1 }],
      vps_commit: "abc123",
    } as BotHealthResponse & { vps_commit: string });

    render(<Probe />);
    await waitForLoadedState();

    expect(screen.getByTestId("bot-version").textContent).toBe("2.0.0");
    expect(screen.getByTestId("vps-head").textContent).toBe("abc123");
    expect(screen.getByTestId("main-head").textContent).toBe("none");
    expect(screen.getByTestId("head-drift").textContent).toBe("false");
    expect(screen.getByTestId("go-live-checks").textContent).toBe("1");
  });

  it("cleans up the polling interval on unmount", async () => {
    setupSuccessfulMocks();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = render(<Probe />);
    await waitForLoadedState();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
