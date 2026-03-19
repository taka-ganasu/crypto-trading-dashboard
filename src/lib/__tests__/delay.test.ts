import { describe, it, expect, vi, afterEach } from "vitest";
import { delay } from "../delay";

afterEach(() => {
  vi.useRealTimers();
});

describe("delay", () => {
  it("resolves after the specified time", async () => {
    vi.useFakeTimers();
    const promise = delay(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it("returns a promise", () => {
    vi.useFakeTimers();
    const result = delay(50);
    expect(result).toBeInstanceOf(Promise);
    vi.advanceTimersByTime(50);
  });

  it("resolves with undefined (no return value)", async () => {
    vi.useFakeTimers();
    const promise = delay(10);
    vi.advanceTimersByTime(10);
    const value = await promise;
    expect(value).toBeUndefined();
  });

  it("does not resolve before the specified time", async () => {
    vi.useFakeTimers();
    let resolved = false;
    delay(100).then(() => { resolved = true; });
    vi.advanceTimersByTime(99);
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it("handles 0ms delay", async () => {
    vi.useFakeTimers();
    const promise = delay(0);
    vi.advanceTimersByTime(0);
    await expect(promise).resolves.toBeUndefined();
  });
});
