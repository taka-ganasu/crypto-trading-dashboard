import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateDateRange,
  fillEquityCurveGaps,
  fillStrategyPnlGaps,
} from "../chartUtils";
import type { EquityCurvePoint, TradeByStrategyDaily } from "@/types";

// Helper to mock getLocalToday via Date
function mockToday(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(y, m - 1, d, 9, 30, 0)); // 09:30 local
}

afterEach(() => {
  vi.useRealTimers();
});

// ── generateDateRange ──────────────────────────────────────

describe("generateDateRange", () => {
  it("returns single date when start equals end", () => {
    expect(generateDateRange("2026-01-15", "2026-01-15")).toEqual([
      "2026-01-15",
    ]);
  });

  it("returns 3 consecutive dates", () => {
    expect(generateDateRange("2026-03-01", "2026-03-03")).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
  });
});

// ── fillEquityCurveGaps ────────────────────────────────────

describe("fillEquityCurveGaps", () => {
  it("returns empty array for empty input", () => {
    expect(fillEquityCurveGaps([])).toEqual([]);
  });

  it("returns data unchanged when dates are continuous", () => {
    mockToday("2026-03-03");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
      { date: "2026-03-02", balance: 1010, daily_pnl: 10, cumulative_pnl: 10 },
      { date: "2026-03-03", balance: 1020, daily_pnl: 10, cumulative_pnl: 20 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toEqual(data);
  });

  it("fills every-other-day gaps with carry-forward", () => {
    mockToday("2026-03-05");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
      { date: "2026-03-03", balance: 1020, daily_pnl: 20, cumulative_pnl: 20 },
      { date: "2026-03-05", balance: 1050, daily_pnl: 30, cumulative_pnl: 50 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toHaveLength(5);
    // Gap day 2026-03-02: carry-forward from 03-01
    expect(result[1]).toEqual({
      date: "2026-03-02",
      balance: 1000,
      daily_pnl: 0,
      cumulative_pnl: 0,
    });
    // Gap day 2026-03-04: carry-forward from 03-03
    expect(result[3]).toEqual({
      date: "2026-03-04",
      balance: 1020,
      daily_pnl: 0,
      cumulative_pnl: 20,
    });
  });

  it("adds today when last data date is yesterday", () => {
    mockToday("2026-03-06");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-05", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({
      date: "2026-03-06",
      balance: 1000,
      daily_pnl: 0,
      cumulative_pnl: 0,
    });
  });

  it("does not overwrite when last data date is today", () => {
    mockToday("2026-03-05");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-05", balance: 1050, daily_pnl: 50, cumulative_pnl: 50 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toHaveLength(1);
    expect(result[0].daily_pnl).toBe(50);
  });

  it("handles single data point (not today)", () => {
    mockToday("2026-03-10");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-08", balance: 500, daily_pnl: 5, cumulative_pnl: 5 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toHaveLength(3); // 08, 09, 10
    expect(result[0].date).toBe("2026-03-08");
    expect(result[2].date).toBe("2026-03-10");
    expect(result[2].balance).toBe(500);
  });

  it("respects includeToday=false", () => {
    mockToday("2026-03-10");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-07", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
      { date: "2026-03-09", balance: 1020, daily_pnl: 20, cumulative_pnl: 20 },
    ];
    const result = fillEquityCurveGaps(data, false);
    expect(result).toHaveLength(3); // 07, 08, 09 (no 10)
    expect(result[2].date).toBe("2026-03-09");
  });
});

// ── fillStrategyPnlGaps ───────────────────────────────────

describe("fillStrategyPnlGaps", () => {
  it("returns empty array for empty input", () => {
    expect(fillStrategyPnlGaps([])).toEqual([]);
  });

  it("returns data unchanged when all strategies present on all days", () => {
    mockToday("2026-03-02");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "A", daily_pnl: 10, trade_count: 2 },
      { date: "2026-03-01", strategy: "B", daily_pnl: -5, trade_count: 1 },
      { date: "2026-03-02", strategy: "A", daily_pnl: 15, trade_count: 3 },
      { date: "2026-03-02", strategy: "B", daily_pnl: 8, trade_count: 2 },
    ];
    const result = fillStrategyPnlGaps(data);
    expect(result).toHaveLength(4);
    // Verify original data preserved
    expect(result.find((r) => r.date === "2026-03-01" && r.strategy === "A")?.daily_pnl).toBe(10);
  });

  it("fills missing strategy on a day with zero values", () => {
    mockToday("2026-03-02");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "A", daily_pnl: 10, trade_count: 2 },
      { date: "2026-03-01", strategy: "B", daily_pnl: -5, trade_count: 1 },
      { date: "2026-03-02", strategy: "A", daily_pnl: 15, trade_count: 3 },
      // B missing on 03-02
    ];
    const result = fillStrategyPnlGaps(data);
    expect(result).toHaveLength(4);
    const missingB = result.find((r) => r.date === "2026-03-02" && r.strategy === "B");
    expect(missingB).toEqual({
      date: "2026-03-02",
      strategy: "B",
      daily_pnl: 0,
      trade_count: 0,
    });
  });

  it("fills missing date gap for all strategies", () => {
    mockToday("2026-03-03");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "X", daily_pnl: 10, trade_count: 1 },
      { date: "2026-03-03", strategy: "X", daily_pnl: 20, trade_count: 2 },
    ];
    const result = fillStrategyPnlGaps(data);
    expect(result).toHaveLength(3); // 01, 02, 03 × 1 strategy
    expect(result[1]).toEqual({
      date: "2026-03-02",
      strategy: "X",
      daily_pnl: 0,
      trade_count: 0,
    });
  });

  it("adds today supplement when last date is before today", () => {
    mockToday("2026-03-05");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-03", strategy: "A", daily_pnl: 10, trade_count: 1 },
    ];
    const result = fillStrategyPnlGaps(data);
    // 03, 04, 05 × 1 strategy = 3
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({
      date: "2026-03-05",
      strategy: "A",
      daily_pnl: 0,
      trade_count: 0,
    });
  });
});
