import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/system",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchSystemHealth: vi.fn(),
  fetchSystemMetrics: vi.fn(),
  fetchSystemInfo: vi.fn(),
  fetchBotHealth: vi.fn(),
  fetchApiErrors: vi.fn(),
}));

// Mock child components
vi.mock("@/components/system/HealthSection", () => ({
  default: ({
    systemError,
    status,
    goLiveChecks,
  }: {
    systemError: string | null;
    status: string;
    goLiveChecks: Array<{ name: string; status: string }>;
  }) => (
    <div data-testid="health-section">
      Status: {status}
      {systemError && <span>{systemError}</span>}
      {goLiveChecks.map((check) => (
        <span key={check.name}>
          {check.name}:{check.status}
        </span>
      ))}
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
    expandedTraceKey,
    onToggleTrace,
  }: {
    apiErrors: unknown[];
    errorLogError: string | null;
    expandedTraceKey: string | null;
    onToggleTrace: (key: string) => void;
  }) => (
    <div data-testid="error-log-section">
      {errorLogError && <span>{errorLogError}</span>}
      <span>Expanded: {expandedTraceKey ?? "none"}</span>
      <button type="button" onClick={() => onToggleTrace("trace-1")}>
        Toggle trace
      </button>
      {apiErrors.length} errors
    </div>
  ),
}));

import SystemPage from "../system/page";
import {
  fetchSystemHealth,
  fetchSystemMetrics,
  fetchSystemInfo,
  fetchBotHealth,
  fetchApiErrors,
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
    {
      name: "exchange",
      status: "ok",
      message: "Running",
      latency_ms: 200,
    },
  ],
};

const mockApiErrors = [
  {
    ts: "2026-03-15T10:00:00",
    status_code: 500,
    method: "GET",
    path: "/api/health",
    detail: "Internal Server Error",
    exc_type: "ValueError",
    traceback: "Traceback...",
  },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setupMocksSuccess() {
  vi.mocked(fetchSystemHealth).mockResolvedValue(mockHealth);
  vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
  vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
  vi.mocked(fetchBotHealth).mockResolvedValue(mockBotHealth);
  vi.mocked(fetchApiErrors).mockResolvedValue(mockApiErrors);
}

function setupMocksAllFail() {
  vi.mocked(fetchSystemHealth).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchSystemMetrics).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchSystemInfo).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchBotHealth).mockRejectedValue(new Error("fail"));
  vi.mocked(fetchApiErrors).mockRejectedValue(new Error("fail"));
}

describe("System Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchSystemHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchSystemMetrics).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchSystemInfo).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchBotHealth).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchApiErrors).mockReturnValue(new Promise(() => {}));

    render(<SystemPage />);
    expect(screen.getByText("Loading system data...")).toBeDefined();
  });

  it("shows system page with data on success", async () => {
    setupMocksSuccess();

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    // Page title and description
    expect(
      screen.getByText("Process health, resource usage, and API information")
    ).toBeDefined();

    // Tab buttons
    expect(screen.getByTestId("system-tab-info")).toBeDefined();
    expect(screen.getByTestId("system-tab-error-log")).toBeDefined();

    // Sub-sections rendered (info tab is default)
    expect(screen.getByTestId("health-section")).toBeDefined();
    expect(screen.getByTestId("metrics-section")).toBeDefined();
    expect(screen.getByTestId("config-section")).toBeDefined();
  });

  it("shows system error when system APIs fail", async () => {
    setupMocksAllFail();

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    // Health section receives error message
    expect(screen.getByTestId("health-section")).toBeDefined();
    expect(
      screen.getByText(/Failed to fetch/)
    ).toBeDefined();
  });

  it("shows partial data when some APIs fail", async () => {
    vi.mocked(fetchSystemHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemMetrics).mockRejectedValue(new Error("fail"));
    vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
    vi.mocked(fetchBotHealth).mockResolvedValue(mockBotHealth);
    vi.mocked(fetchApiErrors).mockResolvedValue([]);

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    // Health section shows status even with partial failure
    expect(screen.getByTestId("health-section")).toBeDefined();
    expect(screen.getByText(/Failed to fetch: metrics/)).toBeDefined();
  });

  it("renders with null bot health fields", async () => {
    vi.mocked(fetchSystemHealth).mockResolvedValue(mockHealth);
    vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
    vi.mocked(fetchBotHealth).mockResolvedValue({
      status: null,
      health: null,
      state: null,
    });
    vi.mocked(fetchApiErrors).mockResolvedValue([]);

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    // ConfigSection renders without bot version
    expect(screen.getByTestId("config-section")).toBeDefined();
  });

  it("shows error log tab content", async () => {
    setupMocksSuccess();

    const { container } = render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    // Click "Error Log" tab
    const errorLogTab = screen.getByTestId("system-tab-error-log");
    errorLogTab.click();

    await waitFor(() => {
      expect(screen.getByTestId("error-log-section")).toBeDefined();
    });

    expect(screen.getByText("1 errors")).toBeDefined();
  });

  it("normalizes nested bot health data and toggles trace expansion", async () => {
    vi.mocked(fetchSystemHealth).mockResolvedValue({
      ...mockHealth,
      status: "degraded",
    });
    vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
    vi.mocked(fetchBotHealth).mockResolvedValue({
      data: {
        app_version: "1.2.3",
        vps_commit: "abc123",
        origin_main_head: "def456",
        checks: [
          { name: "exchange", status: "warning", message: "Lagging", latency_ms: 12 },
          { status: "fail", message: null, latency_ms: null },
        ],
      },
    });
    vi.mocked(fetchApiErrors).mockResolvedValue(mockApiErrors);

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("System")).toBeDefined();
    });

    expect(screen.getByText("Status: DEGRADED")).toBeDefined();
    expect(screen.getByText("exchange:warning")).toBeDefined();
    expect(screen.getByText("check_2:error")).toBeDefined();
    expect(screen.getByText("Bot: 1.2.3")).toBeDefined();
    expect(screen.getByText("VPS: abc123")).toBeDefined();
    expect(screen.getByText("Main: def456")).toBeDefined();
    expect(screen.getByText("Drift: true")).toBeDefined();

    fireEvent.click(screen.getByTestId("system-tab-error-log"));

    await waitFor(() => {
      expect(screen.getByText("Expanded: none")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Toggle trace"));
    await waitFor(() => {
      expect(screen.getByText("Expanded: trace-1")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Toggle trace"));
    await waitFor(() => {
      expect(screen.getByText("Expanded: none")).toBeDefined();
    });
  });

  it("uses fallback error log messaging for non-Error failures", async () => {
    vi.mocked(fetchSystemHealth).mockResolvedValue({
      ...mockHealth,
      status: "mystery",
    });
    vi.mocked(fetchSystemMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(fetchSystemInfo).mockResolvedValue(mockInfo);
    vi.mocked(fetchBotHealth).mockResolvedValue({
      data: {
        checks: "invalid",
      },
    } as never);
    vi.mocked(fetchApiErrors).mockRejectedValue("permission denied");

    render(<SystemPage />);

    await waitFor(() => {
      expect(screen.getByText("Status: unreachable")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("system-tab-error-log"));

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch error logs")).toBeDefined();
    });
  });
});
