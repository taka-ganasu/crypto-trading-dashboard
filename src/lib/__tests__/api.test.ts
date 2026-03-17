import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchTrades,
  fetchTradeSummary,
  fetchSignals,
  fetchPortfolioState,
  fetchCircuitBreakerState,
  fetchSystemHealth,
  fetchBotHealth,
  fetchStrategies,
  fetchEquityCurve,
  fetchPerformanceSummary,
} from "../api";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function mockFetchOk(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number, statusText: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchJSON (via fetch wrapper functions)", () => {
  it("returns parsed JSON on success", async () => {
    const payload = { trades: [], total: 0 };
    globalThis.fetch = mockFetchOk(payload);

    const result = await fetchTradeSummary();
    expect(result).toEqual(payload);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws on non-200 response", async () => {
    globalThis.fetch = mockFetchError(500, "Internal Server Error");

    await expect(fetchSystemHealth()).rejects.toThrow("API error: 500");
  });

  it("throws on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchBotHealth()).rejects.toThrow("Failed to fetch");
  });

  it("throws timeout error on abort", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new DOMException("The operation was aborted", "AbortError");
      return Promise.reject(error);
    });

    await expect(fetchCircuitBreakerState()).rejects.toThrow("Request timed out (5s)");
  });
});

describe("fetchTrades", () => {
  it("builds URL with default parameters", async () => {
    const payload = { trades: [], total: 0 };
    globalThis.fetch = mockFetchOk(payload);

    await fetchTrades();

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/trades?");
    expect(url).toContain("limit=50");
  });

  it("includes symbol when provided", async () => {
    globalThis.fetch = mockFetchOk({ trades: [], total: 0 });

    await fetchTrades("BTC/USDT");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("symbol=BTC");
  });

  it("includes offset when > 0", async () => {
    globalThis.fetch = mockFetchOk({ trades: [], total: 0 });

    await fetchTrades(undefined, 50, undefined, undefined, undefined, 100);

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("offset=100");
  });

  it("includes execution_mode when not 'all'", async () => {
    globalThis.fetch = mockFetchOk({ trades: [], total: 0 });

    await fetchTrades(undefined, 50, undefined, undefined, "live");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("execution_mode=live");
  });

  it("omits execution_mode when 'all'", async () => {
    globalThis.fetch = mockFetchOk({ trades: [], total: 0 });

    await fetchTrades(undefined, 50, undefined, undefined, "all");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).not.toContain("execution_mode");
  });
});

describe("fetchSignals", () => {
  it("builds URL with default limit 1000", async () => {
    globalThis.fetch = mockFetchOk({ signals: [], total: 0 });

    await fetchSignals();

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("limit=1000");
  });

  it("includes date range when provided", async () => {
    globalThis.fetch = mockFetchOk({ signals: [], total: 0 });

    await fetchSignals(undefined, 100, "2026-01-01", "2026-01-31");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("start=2026-01-01");
    expect(url).toContain("end=2026-01-31");
  });
});

describe("fetchPortfolioState", () => {
  it("omits query string when no execution mode", async () => {
    globalThis.fetch = mockFetchOk({});

    await fetchPortfolioState();

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/portfolio/state");
    expect(url).not.toContain("?");
  });

  it("appends execution_mode when specified", async () => {
    globalThis.fetch = mockFetchOk({});

    await fetchPortfolioState("paper");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("execution_mode=paper");
  });
});

describe("fetchEquityCurve", () => {
  it("falls back to /performance/equity-curve on 404", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    });

    const result = await fetchEquityCurve();
    expect(result).toEqual({ data: [] });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    const secondUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
    expect(secondUrl).toContain("/performance/equity-curve");
  });

  it("throws non-404 errors without fallback", async () => {
    globalThis.fetch = mockFetchError(500, "Internal Server Error");

    await expect(fetchEquityCurve()).rejects.toThrow("API error: 500");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchStrategies", () => {
  it("builds URL without query for no mode", async () => {
    globalThis.fetch = mockFetchOk({ strategies: [] });

    await fetchStrategies();

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/strategies");
    expect(url).not.toContain("?");
  });
});

describe("fetchPerformanceSummary", () => {
  it("includes execution_mode in URL", async () => {
    globalThis.fetch = mockFetchOk({});

    await fetchPerformanceSummary("live");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("execution_mode=live");
  });
});
