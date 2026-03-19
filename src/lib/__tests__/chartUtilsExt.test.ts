/**
 * Extended chartUtils tests.
 *
 * Covers: generateDateRange edge cases (empty, month/year boundary),
 * fillEquityCurveGaps with unsorted input and multi-day gaps,
 * fillStrategyPnlGaps with includeToday=false and multi-strategy gaps.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateDateRange,
  fillEquityCurveGaps,
  fillStrategyPnlGaps,
} from "../chartUtils";
import type { EquityCurvePoint, TradeByStrategyDaily } from "@/types";

function mockToday(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(y, m - 1, d, 9, 30, 0));
}

afterEach(() => {
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ */
/* generateDateRange — edge cases                                      */
/* ------------------------------------------------------------------ */

describe("generateDateRange — edge cases", () => {
  it("returns empty array when start > end", () => {
    expect(generateDateRange("2026-03-10", "2026-03-05")).toEqual([]);
  });

  it("crosses month boundary (Feb → Mar, non-leap year)", () => {
    const result = generateDateRange("2026-02-27", "2026-03-02");
    expect(result).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
      "2026-03-02",
    ]);
  });

  it("crosses year boundary (Dec → Jan)", () => {
    const result = generateDateRange("2025-12-30", "2026-01-02");
    expect(result).toEqual([
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("handles leap year Feb 29", () => {
    const result = generateDateRange("2024-02-28", "2024-03-01");
    expect(result).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
  });
});

/* ------------------------------------------------------------------ */
/* fillEquityCurveGaps — extended edge cases                           */
/* ------------------------------------------------------------------ */

describe("fillEquityCurveGaps — extended", () => {
  it("sorts unsorted input correctly before filling", () => {
    mockToday("2026-03-03");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-03", balance: 1020, daily_pnl: 10, cumulative_pnl: 20 },
      { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-03-01");
    expect(result[1].date).toBe("2026-03-02");
    expect(result[2].date).toBe("2026-03-03");
    // Gap day carries from sorted first entry
    expect(result[1].balance).toBe(1000);
    expect(result[1].daily_pnl).toBe(0);
  });

  it("fills a week-long gap correctly", () => {
    mockToday("2026-03-08");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
      { date: "2026-03-08", balance: 1100, daily_pnl: 100, cumulative_pnl: 100 },
    ];
    const result = fillEquityCurveGaps(data);
    expect(result).toHaveLength(8); // 01 through 08
    // All gap days carry from 03-01
    for (let i = 1; i <= 6; i++) {
      expect(result[i].balance).toBe(1000);
      expect(result[i].daily_pnl).toBe(0);
      expect(result[i].cumulative_pnl).toBe(0);
    }
    expect(result[7].balance).toBe(1100);
  });

  it("does not mutate original array", () => {
    mockToday("2026-03-03");
    const data: EquityCurvePoint[] = [
      { date: "2026-03-03", balance: 1020, daily_pnl: 10, cumulative_pnl: 20 },
      { date: "2026-03-01", balance: 1000, daily_pnl: 0, cumulative_pnl: 0 },
    ];
    fillEquityCurveGaps(data);
    // Original array order preserved
    expect(data[0].date).toBe("2026-03-03");
    expect(data[1].date).toBe("2026-03-01");
  });
});

/* ------------------------------------------------------------------ */
/* fillStrategyPnlGaps — extended edge cases                           */
/* ------------------------------------------------------------------ */

describe("fillStrategyPnlGaps — extended", () => {
  it("respects includeToday=false", () => {
    mockToday("2026-03-10");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-07", strategy: "A", daily_pnl: 10, trade_count: 1 },
      { date: "2026-03-09", strategy: "A", daily_pnl: 20, trade_count: 2 },
    ];
    const result = fillStrategyPnlGaps(data, false);
    expect(result).toHaveLength(3); // 07, 08, 09 (no 10)
    expect(result[2].date).toBe("2026-03-09");
  });

  it("fills 3 strategies across 3 days with cross-gaps", () => {
    mockToday("2026-03-03");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "X", daily_pnl: 10, trade_count: 1 },
      { date: "2026-03-02", strategy: "Y", daily_pnl: 5, trade_count: 1 },
      { date: "2026-03-03", strategy: "Z", daily_pnl: 8, trade_count: 1 },
    ];
    const result = fillStrategyPnlGaps(data);
    // 3 days × 3 strategies = 9 entries
    expect(result).toHaveLength(9);

    // X only has data on day 1, zero on days 2-3
    const xDay2 = result.find((r) => r.date === "2026-03-02" && r.strategy === "X");
    expect(xDay2).toEqual({
      date: "2026-03-02",
      strategy: "X",
      daily_pnl: 0,
      trade_count: 0,
    });

    // Y only has data on day 2
    const yDay1 = result.find((r) => r.date === "2026-03-01" && r.strategy === "Y");
    expect(yDay1?.daily_pnl).toBe(0);
    expect(yDay1?.trade_count).toBe(0);

    // Z only has data on day 3
    const zDay3 = result.find((r) => r.date === "2026-03-03" && r.strategy === "Z");
    expect(zDay3?.daily_pnl).toBe(8);
  });

  it("preserves existing data when all strategies present all days", () => {
    mockToday("2026-03-02");
    const data: TradeByStrategyDaily[] = [
      { date: "2026-03-01", strategy: "A", daily_pnl: 10, trade_count: 2 },
      { date: "2026-03-01", strategy: "B", daily_pnl: -5, trade_count: 1 },
      { date: "2026-03-02", strategy: "A", daily_pnl: 15, trade_count: 3 },
      { date: "2026-03-02", strategy: "B", daily_pnl: 8, trade_count: 2 },
    ];
    const result = fillStrategyPnlGaps(data);
    expect(result).toHaveLength(4);
    // No synthetic entries — all original data preserved
    const origA = result.find((r) => r.date === "2026-03-01" && r.strategy === "A");
    expect(origA?.daily_pnl).toBe(10);
    expect(origA?.trade_count).toBe(2);
  });
});
