import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/system",
}));

vi.mock("@/lib/api", () => ({
  fetchSystemHealth: vi.fn(),
  fetchSystemMetrics: vi.fn(),
  fetchSystemInfo: vi.fn(),
  fetchBotHealth: vi.fn(),
  fetchJSON: vi.fn(),
}));

vi.mock("@/components/system/HealthSection", () => ({
  default: ({
    systemError,
    status,
  }: {
    systemError: string | null;
    status: string;
  }) => (
    <div data-testid="health-section">
      Status: {status}
      {systemError && <span data-testid="system-error">{systemError}</span>}
    </div>
  ),
}));

vi.mock("@/components/system/MetricsSection", () => ({
  default: ({ metrics }: { metrics: unknown }) => (
    <div data-testid="metrics-section">
      {metrics ? "Metrics loaded" : "No metrics"}
    </div>
  ),
}));

vi.mock("@/components/system/ConfigSection", () => ({
  default: ({
    botVersionFromHealth,
    vpsHead,
    mainHead,
    isHeadDrift,
  }: {
    botVersionFromHealth: string | null;
    vpsHead: string | null;
    mainHead: string | null;
    isHeadDrift: boolean;
  }) => (
    <div data-testid="config-section">
      {botVersionFromHealth && <span>Bot: {botVersionFromHealth}</span>}
      {vpsHead && <span>VPS: {vpsHead}</span>}
      {mainHead && <span>Main: {mainHead}</span>}
      <span>Drift: {String(isHeadDrift)}</span>
    </div>
  ),
}));

vi.mock("@/components/system/ErrorLogSection", () => ({
  default: ({
    apiErrors,
    errorLogError,
  }: {
    apiErrors: unknown[];
    errorLogError: string | null;
  }) => (
    <div data-testid="error-log-section">
      {errorLogError && <span>{errorLogError}</span>}
      {apiErrors.length} errors
    </div>
  ),
}));

import SystemPage from "../system/page";
import {
  fetchJSON,
  fetchSystemHealth,
  fetchSystemMetrics,
  fetchSystemInfo,
  fetchBotHealth,
} from "@/lib/api";

const mockHealth = {
  status: "ok",
  db_connected: true,
  exchange_connected: true,
  uptime_seconds: 86400,
  pid: 12345,
};

const mockMetrics = {
  memory_mb: 256,
  cpu_percent: 15.5,
  ws_connected: true,
  last_fr_fetch: "2026-03-15T10:00:00",
  open_positions: 3,
};

const mockInfo = {
  db_path: "/opt/crypto-trading-bot/data/trades.db",
  api_version: "1.0.0",
  bot_version: "0.2.0",
  python_version: "3.10.12",
  platform: "Linux",
};

const mockBotHealth = {
  status: "healthy",
  bot_version: "0.2.0",
  git_commit: "d992823",
  checks: [
    { name: "db", status: "ok", message: "Connected", latency_ms: 0.1 },
  ],
};

function setupMocksSuccess() {
  vi.mocked(fetchSystemHealth).mockResolvedValue(mockHealth);
  vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
  vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
  vi.mocked(fetchBotHealth).mockResolvedValue(mockBotHealth);
  vi.mocked(fetchJSON).mockResolvedValue([]);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("System Page — extended", () => {
  it("auto-refreshes data every 30 seconds", async () => {
    setupMocksSuccess();

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    // Initial load: each API called once
    expect(fetchSystemHealth).toHaveBeenCalledTimes(1);
    expect(fetchSystemMetrics).toHaveBeenCalledTimes(1);

    // Advance 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(fetchSystemHealth).toHaveBeenCalledTimes(2);
    });

    expect(fetchSystemMetrics).toHaveBeenCalledTimes(2);
  });

  it("shows no head drift when vpsHead equals mainHead", async () => {
    vi.mocked(fetchSystemHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
    vi.mocked(fetchBotHealth).mockResolvedValue({
      data: {
        app_version: "1.0.0",
        vps_commit: "abc123",
        origin_main_head: "abc123", // same as vps
        checks: [],
      },
    });
    vi.mocked(fetchJSON).mockResolvedValue([]);

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    expect(screen.getByText("Drift: false")).toBeDefined();
  });

  it("shows head drift when vpsHead differs from mainHead", async () => {
    vi.mocked(fetchSystemHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
    vi.mocked(fetchBotHealth).mockResolvedValue({
      data: {
        app_version: "1.0.0",
        vps_commit: "abc123",
        origin_main_head: "def456", // different
        checks: [],
      },
    });
    vi.mocked(fetchJSON).mockResolvedValue([]);

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    expect(screen.getByText("VPS: abc123")).toBeDefined();
    expect(screen.getByText("Main: def456")).toBeDefined();
    expect(screen.getByText("Drift: true")).toBeDefined();
  });

  it("handles all APIs failing simultaneously", async () => {
    vi.mocked(fetchSystemHealth).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemMetrics).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemInfo).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchJSON).mockRejectedValue(new Error("fail"));

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    expect(screen.getByTestId("system-error")).toBeDefined();
    expect(
      screen.getByText("Failed to fetch: health, metrics, info, bot_health")
    ).toBeDefined();
  });

  it("cleans up interval on unmount", async () => {
    setupMocksSuccess();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("renders loading spinner when all data is null and loading", () => {
    vi.mocked(fetchSystemHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchSystemMetrics).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchSystemInfo).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchBotHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchJSON).mockReturnValue(new Promise(() => {}));

    render(<SystemPage />);
    expect(screen.getByText("Loading system data...")).toBeDefined();
  });
});
