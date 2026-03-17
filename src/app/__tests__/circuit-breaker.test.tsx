import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/circuit-breaker",
}));

// Mock API
vi.mock("@/lib/api", () => ({
  fetchCircuitBreakerState: vi.fn(),
}));

import CircuitBreakerPage from "../circuit-breaker/page";
import { fetchCircuitBreakerState } from "@/lib/api";

const mockCBStateNormal = {
  data: {
    status: "NORMAL",
    recent_events: [],
  },
};

const mockCBStateWarning = {
  data: {
    status: "WARNING",
    recent_events: [
      {
        status: "WARNING",
        message: "Consecutive loss threshold reached",
        timestamp: "2026-03-15T10:00:00",
      },
    ],
  },
};

const mockCBStateStopped = {
  data: {
    status: "STOPPED",
    recent_events: [
      {
        status: "STOPPED",
        message: "Critical threshold exceeded",
        timestamp: "2026-03-15T12:00:00",
      },
      {
        status: "PAUSED",
        message: "Further losses detected",
        timestamp: "2026-03-15T11:00:00",
      },
    ],
  },
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Circuit Breaker Page", () => {
  it("shows loading spinner initially", () => {
    vi.mocked(fetchCircuitBreakerState).mockReturnValue(new Promise(() => {}));

    render(<CircuitBreakerPage />);
    expect(screen.getByText("Loading circuit breaker data...")).toBeDefined();
  });

  it("shows error state when API fails", async () => {
    vi.mocked(fetchCircuitBreakerState).mockRejectedValue(
      new Error("Network error")
    );

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load circuit breaker state")
      ).toBeDefined();
    });

    expect(screen.getByText("Network error")).toBeDefined();
  });

  it("shows NORMAL status on success", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCBStateNormal);

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getAllByText("NORMAL").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("Circuit Breaker")).toBeDefined();
    expect(
      screen.getByText("All systems operational. Trading is active.")
    ).toBeDefined();
    expect(screen.getByText("Current Status")).toBeDefined();
  });

  it("shows WARNING status with description", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCBStateWarning);

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      // Multiple WARNING badges expected (status + event + transitions)
      expect(screen.getAllByText("WARNING").length).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.getByText(
        "Consecutive loss threshold reached. Leverage reduced automatically."
      )
    ).toBeDefined();
  });

  it("shows STOPPED status with description", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCBStateStopped);

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getAllByText("STOPPED").length).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.getByText(
        "Critical threshold exceeded. All positions closed and system shut down. Manual restart required."
      )
    ).toBeDefined();
  });

  it("shows state transitions section", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCBStateNormal);

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getByText("State Transitions")).toBeDefined();
    });

    // Verify transition triggers
    expect(
      screen.getByText("Consecutive loss threshold reached")
    ).toBeDefined();
    expect(
      screen.getByText("Further losses beyond WARNING threshold")
    ).toBeDefined();
    expect(
      screen.getByText("Critical drawdown limit exceeded")
    ).toBeDefined();
    // Two transitions share same trigger text
    expect(
      screen.getAllByText("Gradual recovery over 12 hours").length
    ).toBe(2);

    // Verify transition actions
    expect(
      screen.getByText("Leverage is automatically reduced")
    ).toBeDefined();
    expect(
      screen.getByText("Positions reduced by 50%, new trades halted")
    ).toBeDefined();
    expect(
      screen.getByText("All positions closed, system shutdown")
    ).toBeDefined();
  });

  it("shows 'No circuit breaker events recorded' when events empty", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCBStateNormal);

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No circuit breaker events recorded")
      ).toBeDefined();
    });
  });

  it("shows recent events when present", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue(mockCBStateStopped);

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getByText("Recent Events")).toBeDefined();
    });

    expect(screen.getByText("Critical threshold exceeded")).toBeDefined();
    expect(screen.getByText("Further losses detected")).toBeDefined();
    expect(screen.getByText("2026-03-15T12:00:00")).toBeDefined();
    expect(screen.getByText("2026-03-15T11:00:00")).toBeDefined();
  });

  it("normalizes unknown status to NORMAL", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue({
      data: {
        status: "UNKNOWN_VALUE",
        recent_events: [],
      },
    });

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getAllByText("NORMAL").length).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.getByText("All systems operational. Trading is active.")
    ).toBeDefined();
  });

  it("normalizes lowercase status", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue({
      data: {
        status: "warning",
        recent_events: [],
      },
    });

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getAllByText("WARNING").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles null data fields gracefully", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue({
      data: {
        status: null,
        recent_events: null,
      },
    });

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getAllByText("NORMAL").length).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.getByText("No circuit breaker events recorded")
    ).toBeDefined();
  });

  it("shows event with null message as 'State change'", async () => {
    vi.mocked(fetchCircuitBreakerState).mockResolvedValue({
      data: {
        status: "WARNING",
        recent_events: [
          {
            status: "WARNING",
            message: null,
            timestamp: "2026-03-15T10:00:00",
          },
        ],
      },
    });

    render(<CircuitBreakerPage />);

    await waitFor(() => {
      expect(screen.getByText("State change")).toBeDefined();
    });
  });
});
