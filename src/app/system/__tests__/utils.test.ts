import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError, BotHealthResponse } from "@/types";
import {
  buildApiErrorsPath,
  formatSinceIso,
  normalizeApiErrorsPayload,
  normalizeGoLiveChecks,
  normalizeSystemStatus,
  readHealthField,
} from "../utils";

const sampleError: ApiError = {
  ts: "2026-03-24T00:00:00Z",
  status_code: 500,
  method: "GET",
  path: "/api/system/health",
  detail: "Internal Server Error",
  exc_type: "RuntimeError",
  traceback: "Traceback...",
};

describe("system utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats a since timestamp from the requested hour window", () => {
    expect(formatSinceIso(24)).toBe("2026-03-23T12:00:00.000Z");
  });

  it("builds the API errors path without a query string when no params are set", () => {
    expect(buildApiErrorsPath()).toBe("/errors");
  });

  it("builds the API errors path with all supported params", () => {
    expect(buildApiErrorsPath("2026-03-23T12:00:00.000Z", 400, 50)).toBe(
      "/errors?since=2026-03-23T12%3A00%3A00.000Z&status_gte=400&limit=50"
    );
  });

  it("returns the payload unchanged when API errors are already an array", () => {
    expect(normalizeApiErrorsPayload([sampleError])).toEqual([sampleError]);
  });

  it("extracts a nested errors array payload", () => {
    expect(normalizeApiErrorsPayload({ errors: [sampleError] })).toEqual([
      sampleError,
    ]);
  });

  it("returns an empty array for malformed API errors payloads", () => {
    expect(normalizeApiErrorsPayload({ errors: "invalid" })).toEqual([]);
  });

  it.each([
    ["ok", "OK"],
    ["degraded", "DEGRADED"],
    ["down", "DOWN"],
    ["offline", "unreachable"],
  ] as const)(
    "normalizes system status %s to %s",
    (rawStatus, expectedStatus) => {
      expect(normalizeSystemStatus(rawStatus)).toBe(expectedStatus);
    }
  );

  it("reads a health field from the root object", () => {
    const health: BotHealthResponse = {
      version: "1.2.3",
      data: { app_version: "9.9.9" },
    };

    expect(readHealthField(health, ["version", "app_version"])).toBe("1.2.3");
  });

  it("falls back to nested data health fields when root values are blank", () => {
    const health: BotHealthResponse = {
      version: " ",
      data: { app_version: "1.2.3" },
    };

    expect(readHealthField(health, ["version", "app_version"])).toBe("1.2.3");
  });

  it("returns null when no health field matches", () => {
    expect(readHealthField(null, ["version"])).toBeNull();
  });

  it("normalizes root go-live checks and status aliases", () => {
    const health: BotHealthResponse = {
      checks: [
        {
          name: "database",
          status: "warn",
          message: "Slow queries",
          latency_ms: 120,
        },
        {
          name: "exchange",
          status: "FAIL",
          message: "Unavailable",
          latency_ms: null,
        },
      ],
    };

    expect(normalizeGoLiveChecks(health)).toEqual([
      {
        name: "database",
        status: "warning",
        message: "Slow queries",
        latencyMs: 120,
      },
      {
        name: "exchange",
        status: "error",
        message: "Unavailable",
        latencyMs: null,
      },
    ]);
  });

  it("falls back to nested go-live checks and default values", () => {
    const health: BotHealthResponse = {
      data: {
        checks: [
          {
            status: "mystery",
            message: " ",
            latency_ms: Number.POSITIVE_INFINITY,
          },
          {},
        ],
      },
    };

    expect(normalizeGoLiveChecks(health)).toEqual([
      {
        name: "check_1",
        status: "unknown",
        message: "—",
        latencyMs: null,
      },
      {
        name: "check_2",
        status: "unknown",
        message: "—",
        latencyMs: null,
      },
    ]);
  });

  it("returns an empty go-live checklist for non-object health payloads", () => {
    expect(normalizeGoLiveChecks(null)).toEqual([]);
  });
});
