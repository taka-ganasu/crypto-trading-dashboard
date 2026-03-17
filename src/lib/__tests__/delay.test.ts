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
});
