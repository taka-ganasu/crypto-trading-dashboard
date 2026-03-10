import type { EquityCurvePoint, TradeByStrategyDaily } from "@/types";

/**
 * Returns today's date in YYYY-MM-DD format using browser local time.
 * MUST NOT use toISOString() — it converts to UTC and shifts the date in JST.
 */
export function getLocalToday(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generates an array of date strings (YYYY-MM-DD) from start to end inclusive.
 */
export function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const current = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);

  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Fills gaps in equity curve data by carrying forward the previous day's
 * balance and cumulative_pnl, with daily_pnl=0 for missing days.
 *
 * - Empty array → empty array (no today supplement)
 * - includeToday=true (default): extends to max(last data date, local today)
 * - Existing data points are never overwritten
 */
export function fillEquityCurveGaps(
  data: EquityCurvePoint[],
  includeToday: boolean = true
): EquityCurvePoint[] {
  if (data.length === 0) return [];

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sorted[0].date;
  let endDate = sorted[sorted.length - 1].date;

  if (includeToday) {
    const today = getLocalToday();
    if (today > endDate) {
      endDate = today;
    }
  }

  const dataMap = new Map<string, EquityCurvePoint>();
  for (const point of sorted) {
    dataMap.set(point.date, point);
  }

  const allDates = generateDateRange(startDate, endDate);
  const result: EquityCurvePoint[] = [];
  let prevBalance = sorted[0].balance;
  let prevCumulativePnl = sorted[0].cumulative_pnl;

  for (const date of allDates) {
    const existing = dataMap.get(date);
    if (existing) {
      result.push(existing);
      prevBalance = existing.balance;
      prevCumulativePnl = existing.cumulative_pnl;
    } else {
      result.push({
        date,
        balance: prevBalance,
        daily_pnl: 0,
        cumulative_pnl: prevCumulativePnl,
      });
    }
  }

  return result;
}

/**
 * Fills gaps in strategy PnL data. For missing days, all known strategies
 * get daily_pnl=0, trade_count=0.
 *
 * - Empty array → empty array (no today supplement)
 * - includeToday=true (default): extends to max(last data date, local today)
 */
export function fillStrategyPnlGaps(
  data: TradeByStrategyDaily[],
  includeToday: boolean = true
): TradeByStrategyDaily[] {
  if (data.length === 0) return [];

  // Collect all unique strategies and dates
  const strategies = new Set<string>();
  const dateSet = new Set<string>();
  const dataMap = new Map<string, TradeByStrategyDaily>();

  for (const point of data) {
    strategies.add(point.strategy);
    dateSet.add(point.date);
    dataMap.set(`${point.date}|${point.strategy}`, point);
  }

  const sortedDates = Array.from(dateSet).sort();
  const startDate = sortedDates[0];
  let endDate = sortedDates[sortedDates.length - 1];

  if (includeToday) {
    const today = getLocalToday();
    if (today > endDate) {
      endDate = today;
    }
  }

  const allDates = generateDateRange(startDate, endDate);
  const strategyList = Array.from(strategies).sort();
  const result: TradeByStrategyDaily[] = [];

  for (const date of allDates) {
    for (const strategy of strategyList) {
      const key = `${date}|${strategy}`;
      const existing = dataMap.get(key);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          date,
          strategy,
          daily_pnl: 0,
          trade_count: 0,
        });
      }
    }
  }

  return result;
}
