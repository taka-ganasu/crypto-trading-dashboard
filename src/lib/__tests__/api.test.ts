import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchJSON,
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
  fetchAnalysisCycles,
  fetchMdseScores,
  fetchMdseSummary,
  fetchMdseEvents,
  fetchMdseTrades,
  fetchMdseTimeline,
  fetchSystemMetrics,
  fetchSystemInfo,
  fetchSystemStatsOverview,
  fetchExecutionQuality,
  fetchMarketSnapshots,
  fetchStrategyPerformance,
  fetchTradesByStrategy,
} from "../api";

// Mock delay to resolve instantly so retry tests don't wait
vi.mock("../delay", () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}));

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

afterEach(() => {
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

  it("throws on non-200 5xx after retries", async () => {
    globalThis.fetch = mockFetchError(500, "Internal Server Error");

    await expect(fetchSystemHealth()).rejects.toThrow("API error: 500");
    // 1 initial + 3 retries = 4 calls
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it("throws on 4xx without retrying", async () => {
    globalThis.fetch = mockFetchError(400, "Bad Request");

    await expect(fetchSystemHealth()).rejects.toThrow("API error: 400");
    // 4xx is not retried
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws on network error after retries", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchBotHealth()).rejects.toThrow("Failed to fetch");
    // Network errors are retried
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it("throws timeout error after retries", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new DOMException("The operation was aborted", "AbortError");
      return Promise.reject(error);
    });

    await expect(fetchCircuitBreakerState()).rejects.toThrow("Request timed out (5s)");
    // Timeouts are retried
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
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
    globalThis.fetch = vi.fn().mockImplementation(() => {
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

  it("throws non-404 errors after retries without fallback", async () => {
    globalThis.fetch = mockFetchError(500, "Internal Server Error");

    await expect(fetchEquityCurve()).rejects.toThrow("API error: 500");
    // 500 is retried 3 times inside fetchJSON, no 404 fallback
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
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

/* ------------------------------------------------------------------ */
/* Retry behavior tests                                                */
/* ------------------------------------------------------------------ */

describe("fetchJSON retry behavior", () => {
  it("retries 5xx and succeeds on 2nd attempt", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      });
    });

    const result = await fetchTradeSummary();
    expect(result).toEqual({ status: "ok" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("retries 5xx 3 times then throws", async () => {
    globalThis.fetch = mockFetchError(502, "Bad Gateway");

    await expect(fetchTradeSummary()).rejects.toThrow("API error: 502");
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it("does not retry 4xx errors", async () => {
    globalThis.fetch = mockFetchError(404, "Not Found");

    await expect(fetchTradeSummary()).rejects.toThrow("API error: 404");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry 401 Unauthorized", async () => {
    globalThis.fetch = mockFetchError(401, "Unauthorized");

    await expect(fetchTradeSummary()).rejects.toThrow("API error: 401");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on network TypeError and succeeds", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: "recovered" }),
      });
    });

    const result = await fetchTradeSummary();
    expect(result).toEqual({ data: "recovered" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("retries on timeout and succeeds", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(
          new DOMException("The operation was aborted", "AbortError")
        );
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: "ok" }),
      });
    });

    const result = await fetchTradeSummary();
    expect(result).toEqual({ data: "ok" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

/* ------------------------------------------------------------------ */
/* fetchAnalysisCycles                                                  */
/* ------------------------------------------------------------------ */

describe("fetchAnalysisCycles", () => {
  it("builds URL with default limit", async () => {
    globalThis.fetch = mockFetchOk([]);

    await fetchAnalysisCycles();

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/cycles?");
    expect(url).toContain("limit=50");
  });

  it("includes date range and execution mode", async () => {
    globalThis.fetch = mockFetchOk([]);

    await fetchAnalysisCycles(100, "2026-01-01", "2026-01-31", "paper");

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("limit=100");
    expect(url).toContain("start=2026-01-01");
    expect(url).toContain("end=2026-01-31");
    expect(url).toContain("execution_mode=paper");
  });
});

/* ------------------------------------------------------------------ */
/* MDSE fetch functions                                                 */
/* ------------------------------------------------------------------ */

describe("fetchMdseScores", () => {
  it("calls /mdse/scores", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseScores();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/mdse/scores");
  });
});

describe("fetchMdseSummary", () => {
  it("calls /mdse/summary", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchMdseSummary();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/mdse/summary");
  });

  it("includes days param when provided", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchMdseSummary(7);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("days=7");
  });

  it("omits days param when not provided", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchMdseSummary();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).not.toContain("days=");
  });
});

describe("fetchMdseEvents", () => {
  it("uses hours param when no start/end", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(48);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("hours=48");
    expect(url).not.toContain("start=");
  });

  it("uses start/end when provided", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(24, "2026-03-01", "2026-03-15");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("start=2026-03-01");
    expect(url).toContain("end=2026-03-15");
    expect(url).not.toContain("hours=");
  });

  it("uses start without end", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(24, "2026-03-01");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("start=2026-03-01");
    expect(url).not.toContain("end=");
  });

  it("includes limit param", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(24, undefined, undefined, 25);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("limit=25");
  });

  it("includes offset when > 0", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(24, undefined, undefined, 50, 100);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=100");
  });

  it("omits offset when 0", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(24, undefined, undefined, 50, 0);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("limit=50");
    expect(url).not.toContain("offset=");
  });

  it("defaults limit=50 and offset=0", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseEvents(24);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("limit=50");
    expect(url).not.toContain("offset=");
  });
});

describe("fetchMdseTrades", () => {
  it("builds URL with default limit", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseTrades();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/mdse/trades?");
    expect(url).toContain("limit=20");
  });

  it("includes date range", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMdseTrades(10, "2026-01-01", "2026-01-31");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("start=2026-01-01");
    expect(url).toContain("end=2026-01-31");
  });
});

describe("fetchMdseTimeline", () => {
  it("uses hours param by default", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchMdseTimeline(12);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/mdse/timeline?");
    expect(url).toContain("hours=12");
  });

  it("uses start/end when provided", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchMdseTimeline(24, "2026-02-01", "2026-02-28");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("start=2026-02-01");
    expect(url).toContain("end=2026-02-28");
  });
});

/* ------------------------------------------------------------------ */
/* System fetch functions                                               */
/* ------------------------------------------------------------------ */

describe("fetchSystemMetrics", () => {
  it("calls /system/metrics", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchSystemMetrics();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/system/metrics");
  });
});

describe("fetchSystemInfo", () => {
  it("calls /system/info", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchSystemInfo();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/system/info");
  });
});

describe("fetchSystemStatsOverview", () => {
  it("calls /system/stats", async () => {
    globalThis.fetch = mockFetchOk({});
    await fetchSystemStatsOverview();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/system/stats");
  });
});

/* ------------------------------------------------------------------ */
/* fetchJSON response mapping                                           */
/* ------------------------------------------------------------------ */

describe("fetchJSON response mapping", () => {
  it("parses nested errors wrapper", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errors: [{ ts: "2026-01-01", path: "/foo" }] }),
    });

    const result = await fetchJSON<
      { errors: unknown } | Array<{ ts: string; path?: string }>,
      Array<{ ts: string; path?: string }>
    >("/errors", {
      mapResponse: (payload) => {
        if (Array.isArray(payload)) return payload;
        return Array.isArray(payload.errors)
          ? (payload.errors as Array<{ ts: string; path?: string }>)
          : [];
      },
    });
    expect(result).toEqual([{ ts: "2026-01-01", path: "/foo" }]);
  });

  it("parses direct array response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ ts: "2026-01-01" }]),
    });

    const result = await fetchJSON<
      { errors: unknown } | Array<{ ts: string }>,
      Array<{ ts: string }>
    >("/errors", {
      mapResponse: (payload) => {
        if (Array.isArray(payload)) return payload;
        return Array.isArray(payload.errors) ? (payload.errors as Array<{ ts: string }>) : [];
      },
    });
    expect(result).toEqual([{ ts: "2026-01-01" }]);
  });

  it("returns empty array for non-array errors field", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ errors: "not-an-array" }),
    });

    const result = await fetchJSON<
      { errors: unknown } | Array<{ ts: string }>,
      Array<{ ts: string }>
    >("/errors", {
      mapResponse: (payload) => {
        if (Array.isArray(payload)) return payload;
        return Array.isArray(payload.errors) ? (payload.errors as Array<{ ts: string }>) : [];
      },
    });
    expect(result).toEqual([]);
  });

  it("returns empty array for non-array non-object response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve("just a string"),
    });

    const result = await fetchJSON<string | Array<{ ts: string }>, Array<{ ts: string }>>(
      "/errors",
      {
        mapResponse: (payload) => (Array.isArray(payload) ? payload : []),
      }
    );
    expect(result).toEqual([]);
  });

  it("preserves the requested path for mapped responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchJSON<Array<{ ts: string }>>("/errors?since=2026-01-01&status_gte=500&limit=10");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("since=2026-01-01");
    expect(url).toContain("status_gte=500");
    expect(url).toContain("limit=10");
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    await expect(fetchJSON("/errors")).rejects.toThrow("API error: 500");
  });
});

/* ------------------------------------------------------------------ */
/* Performance fetch functions                                          */
/* ------------------------------------------------------------------ */

describe("fetchExecutionQuality", () => {
  it("builds URL with limit and execution_mode", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchExecutionQuality(25, "live");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/performance/execution-quality?");
    expect(url).toContain("limit=25");
    expect(url).toContain("execution_mode=live");
  });
});

describe("fetchMarketSnapshots", () => {
  it("builds URL with default limit", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchMarketSnapshots();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/performance/market-snapshots?");
    expect(url).toContain("limit=20");
  });
});

describe("fetchStrategyPerformance", () => {
  it("includes execution_mode in URL", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchStrategyPerformance("paper");
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/performance/by-strategy?");
    expect(url).toContain("execution_mode=paper");
  });

  it("omits query when no mode", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchStrategyPerformance();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/performance/by-strategy");
    expect(url).not.toContain("?");
  });
});

describe("fetchTradesByStrategy", () => {
  it("includes all params", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchTradesByStrategy("2026-01-01", "2026-01-31", "live", 9);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/trades/by-strategy?");
    expect(url).toContain("start_date=2026-01-01");
    expect(url).toContain("end_date=2026-01-31");
    expect(url).toContain("execution_mode=live");
    expect(url).toContain("tz_offset=9");
  });

  it("omits optional params when not provided", async () => {
    globalThis.fetch = mockFetchOk([]);
    await fetchTradesByStrategy();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("/trades/by-strategy");
    expect(url).not.toContain("start_date");
  });
});

describe("fetchEquityCurve with params", () => {
  it("includes date range and tz_offset", async () => {
    globalThis.fetch = mockFetchOk({ data: [] });
    await fetchEquityCurve("2026-01-01", "2026-01-31", "live", 9);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("start_date=2026-01-01");
    expect(url).toContain("end_date=2026-01-31");
    expect(url).toContain("tz_offset=9");
  });

  it("rethrows non-404 errors from primary endpoint", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(fetchEquityCurve()).rejects.toThrow("Network error");
  });
});
