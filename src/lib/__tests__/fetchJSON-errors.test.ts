import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchTradeSummary,
  fetchSystemHealth,
  fetchBotHealth,
  fetchApiErrors,
} from "../api";

// Mock delay to resolve instantly so retry tests don't wait
vi.mock("../delay", () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* Invalid JSON / parse failures                                       */
/* ------------------------------------------------------------------ */

describe("fetchJSON — invalid JSON response", () => {
  it("throws when res.json() rejects with SyntaxError", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON")),
    });

    await expect(fetchTradeSummary()).rejects.toThrow(
      "Unexpected token < in JSON"
    );
    // SyntaxError is not a TypeError → not retried
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws when res.json() rejects with TypeError (non-retryable in fetchOnce)", async () => {
    // TypeError thrown inside fetchOnce (from json()) is still a TypeError
    // and is therefore retried by isRetryable
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new TypeError("Cannot read properties of null")),
    });

    await expect(fetchTradeSummary()).rejects.toThrow(
      "Cannot read properties of null"
    );
    // TypeError is retried as a network-like error
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });
});

/* ------------------------------------------------------------------ */
/* Mixed error types across retries                                    */
/* ------------------------------------------------------------------ */

describe("fetchJSON — mixed error types in retry sequence", () => {
  it("timeout then 503 then success → recovers", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: timeout (AbortError)
        return Promise.reject(
          new DOMException("The operation was aborted", "AbortError")
        );
      }
      if (callCount === 2) {
        // Second call: 503
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: () => Promise.resolve({}),
        });
      }
      // Third call: success
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "recovered" }),
      });
    });

    const result = await fetchTradeSummary();
    expect(result).toEqual({ status: "recovered" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("network error then 500 then 500 then 500 → exhausts retries", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({}),
      });
    });

    await expect(fetchSystemHealth()).rejects.toThrow("API error: 500");
    // 1 initial + 3 retries = 4 calls
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it("4xx stops retry immediately even after retryable errors", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      // Second attempt returns 404 which is NOT retryable
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve({}),
      });
    });

    await expect(fetchBotHealth()).rejects.toThrow("API error: 404");
    // First call → TypeError → retry → 404 → stop (no more retries)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

/* ------------------------------------------------------------------ */
/* Error message format validation                                     */
/* ------------------------------------------------------------------ */

describe("fetchJSON — error message format", () => {
  it("includes both status code and status text in error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.resolve({}),
    });

    await expect(fetchTradeSummary()).rejects.toThrow(
      "API error: 502 Bad Gateway"
    );
  });

  it("timeout error has specific message format", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.reject(new DOMException("The operation was aborted", "AbortError"))
    );

    await expect(fetchTradeSummary()).rejects.toThrow("Request timed out (5s)");
  });
});

/* ------------------------------------------------------------------ */
/* fetchApiErrors — specific error handling                            */
/* ------------------------------------------------------------------ */

describe("fetchApiErrors — additional error handling", () => {
  it("throws API error with status code on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({}),
    });

    await expect(fetchApiErrors()).rejects.toThrow("API error: 403");
  });

  it("handles timeout via AbortError", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.reject(new DOMException("The operation was aborted", "AbortError"))
    );

    // fetchApiErrors has its own try/catch that rethrows Error instances
    await expect(fetchApiErrors()).rejects.toThrow();
  });

  it("wraps non-Error thrown values with descriptive message", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(42);

    await expect(fetchApiErrors()).rejects.toThrow(
      "Failed to fetch error logs"
    );
  });

  it("wraps null thrown value", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(null);

    await expect(fetchApiErrors()).rejects.toThrow(
      "Failed to fetch error logs"
    );
  });

  it("preserves Error instances with original message", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      new Error("Custom fetch error")
    );

    await expect(fetchApiErrors()).rejects.toThrow("Custom fetch error");
  });

  it("returns empty array for object response without errors field", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "something" }),
    });

    const result = await fetchApiErrors();
    expect(result).toEqual([]);
  });

  it("returns empty array for null response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null),
    });

    const result = await fetchApiErrors();
    expect(result).toEqual([]);
  });

  it("omits query params when none provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await fetchApiErrors();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("/errors");
    expect(url).not.toContain("?");
  });
});
