import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPrice,
  formatDuration,
  formatPercent,
  formatPnl,
  colorByPnl,
  formatDateTime,
  formatNumber,
  formatTimestamp,
  formatDate,
  formatTime,
  formatCompactCurrency,
  formatConfidence,
  formatTimestampVerbose,
  formatDateShort,
} from "../format";

describe("formatCurrency", () => {
  it("formats positive value with dollar sign", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("$");
    expect(result).toContain("1,234");
    expect(result).toContain("56");
  });

  it("formats negative value", () => {
    const result = formatCurrency(-99.5);
    expect(result).toContain("-");
    expect(result).toContain("99");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toBe("$0.00");
  });

  it("formats with compact option for large values", () => {
    expect(formatCurrency(1_500_000, { compact: true })).toBe("$1.5M");
    expect(formatCurrency(2_300, { compact: true })).toBe("$2.3K");
    expect(formatCurrency(1_200_000_000, { compact: true })).toBe("$1.2B");
  });

  it("formats small values without compact suffix", () => {
    const result = formatCurrency(42.1, { compact: true });
    expect(result).toContain("42");
    expect(result).not.toContain("K");
    expect(result).not.toContain("M");
  });
});

describe("formatPrice", () => {
  it("formats numeric value with default decimals", () => {
    const result = formatPrice(65432.123456);
    expect(result).toContain("65");
    expect(result).toContain("432");
  });

  it("returns dash for null", () => {
    expect(formatPrice(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatPrice(undefined)).toBe("—");
  });

  it("returns dash for NaN", () => {
    expect(formatPrice(NaN)).toBe("—");
  });

  it("returns dash for Infinity", () => {
    expect(formatPrice(Infinity)).toBe("—");
  });

  it("uses custom nullDisplay", () => {
    expect(formatPrice(null, { nullDisplay: "N/A" })).toBe("N/A");
  });

  it("formats with currency option", () => {
    const result = formatPrice(100.5, { currency: true });
    expect(result).toContain("$");
  });

  it("formats with compact option", () => {
    expect(formatPrice(5_000_000, { compact: true })).toBe("5.0M");
  });
});

describe("formatDuration", () => {
  it("formats seconds under 60 as Xs", () => {
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(1)).toBe("1s");
  });

  it("formats 0 seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(125)).toBe("2m 5s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3661)).toBe("1h 1m");
    expect(formatDuration(7200)).toBe("2h 0m");
  });

  it("returns dash for null", () => {
    expect(formatDuration(null)).toBe("—");
  });

  it("returns dash for negative value", () => {
    expect(formatDuration(-10)).toBe("—");
  });

  it("formats elapsed time between two timestamps", () => {
    const result = formatDuration("2026-01-01T10:00:00Z", "2026-01-01T11:30:00Z");
    expect(result).toBe("1h 30m");
  });

  it("returns dash for invalid timestamp pair", () => {
    expect(formatDuration("invalid", "also-invalid")).toBe("—");
  });
});

describe("formatPercent", () => {
  it("formats with default 2 decimals", () => {
    expect(formatPercent(12.345)).toBe("12.35%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercent(5.1, 0)).toBe("5%");
    expect(formatPercent(99.999, 3)).toBe("99.999%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("formats negative percent", () => {
    expect(formatPercent(-3.5)).toBe("-3.50%");
  });
});

describe("formatPnl", () => {
  it("adds + prefix for positive values", () => {
    expect(formatPnl(12.34)).toBe("+12.34");
  });

  it("keeps - prefix for negative values", () => {
    expect(formatPnl(-5.67)).toBe("-5.67");
  });

  it("adds + prefix for zero", () => {
    expect(formatPnl(0)).toBe("+0.00");
  });
});

describe("colorByPnl", () => {
  it("returns emerald for positive", () => {
    expect(colorByPnl(10)).toBe("text-emerald-400");
  });

  it("returns red for negative", () => {
    expect(colorByPnl(-5)).toBe("text-red-400");
  });

  it("returns emerald for zero", () => {
    expect(colorByPnl(0)).toBe("text-emerald-400");
  });
});

describe("formatDateTime", () => {
  it("formats valid ISO timestamp", () => {
    const result = formatDateTime("2026-03-15T14:30:00Z");
    // Should contain YYYY-MM-DD HH:mm format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it("returns dash for invalid timestamp", () => {
    expect(formatDateTime("not-a-date")).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats with default 2 decimals", () => {
    const result = formatNumber(1234.5);
    expect(result).toContain("1,234");
    expect(result).toContain("50");
  });

  it("formats with custom decimals", () => {
    const result = formatNumber(42, 0);
    expect(result).toBe("42");
  });
});

describe("formatTimestamp", () => {
  it("formats valid ISO timestamp as locale string", () => {
    const result = formatTimestamp("2026-03-15T14:30:00Z");
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns dash for null", () => {
    expect(formatTimestamp(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatTimestamp(undefined)).toBe("—");
  });

  it("returns dash for empty string", () => {
    expect(formatTimestamp("")).toBe("—");
  });

  it("returns dash for invalid date string", () => {
    expect(formatTimestamp("not-a-date")).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats valid ISO timestamp as locale date", () => {
    const result = formatDate("2026-03-15T14:30:00Z");
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(3);
  });

  it("returns dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("returns dash for invalid date string", () => {
    expect(formatDate("xyz")).toBe("—");
  });
});

describe("formatTime", () => {
  it("formats valid ISO timestamp as locale time", () => {
    const result = formatTime("2026-03-15T14:30:00Z");
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(3);
  });

  it("returns dash for null", () => {
    expect(formatTime(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatTime(undefined)).toBe("—");
  });

  it("returns dash for invalid date string", () => {
    expect(formatTime("bad")).toBe("—");
  });
});

describe("formatCompactCurrency", () => {
  it("formats millions with $M suffix", () => {
    expect(formatCompactCurrency(1_500_000)).toBe("$1.5M");
  });

  it("formats negative millions", () => {
    expect(formatCompactCurrency(-2_300_000)).toBe("$-2.3M");
  });

  it("formats thousands with $K suffix", () => {
    expect(formatCompactCurrency(5_000)).toBe("$5.0K");
  });

  it("formats small values without suffix", () => {
    expect(formatCompactCurrency(42)).toBe("$42");
  });

  it("formats zero", () => {
    expect(formatCompactCurrency(0)).toBe("$0");
  });

  it("formats negative thousands", () => {
    expect(formatCompactCurrency(-1_500)).toBe("$-1.5K");
  });

  it("formats value at boundary 999", () => {
    expect(formatCompactCurrency(999)).toBe("$999");
  });

  it("formats value at boundary 1000", () => {
    expect(formatCompactCurrency(1000)).toBe("$1.0K");
  });
});

describe("formatConfidence", () => {
  it("formats valid confidence as percentage", () => {
    expect(formatConfidence(75.123)).toBe("75.1%");
  });

  it("formats zero confidence", () => {
    expect(formatConfidence(0)).toBe("0.0%");
  });

  it("returns dash for null", () => {
    expect(formatConfidence(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatConfidence(undefined)).toBe("—");
  });

  it("returns dash for NaN", () => {
    expect(formatConfidence(NaN)).toBe("—");
  });

  it("returns dash for Infinity", () => {
    expect(formatConfidence(Infinity)).toBe("—");
  });
});

describe("formatTimestampVerbose", () => {
  it("formats valid timestamp with month, day, time including seconds", () => {
    const result = formatTimestampVerbose("2026-03-15T14:30:45Z");
    expect(result).not.toBe("—");
    // Should contain month abbreviation and seconds
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/15/);
  });

  it("returns dash for null", () => {
    expect(formatTimestampVerbose(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatTimestampVerbose(undefined)).toBe("—");
  });

  it("returns dash for empty string", () => {
    expect(formatTimestampVerbose("")).toBe("—");
  });

  it("returns dash for invalid date", () => {
    expect(formatTimestampVerbose("not-a-date")).toBe("—");
  });
});

describe("formatDateShort", () => {
  it("formats valid timestamp with short date and time", () => {
    const result = formatDateShort("2026-03-15T14:30:00Z");
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(5);
  });

  it("returns dash for null", () => {
    expect(formatDateShort(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatDateShort(undefined)).toBe("—");
  });

  it("returns dash for empty string", () => {
    expect(formatDateShort("")).toBe("—");
  });

  it("returns dash for invalid date", () => {
    expect(formatDateShort("invalid")).toBe("—");
  });
});

describe("formatCurrency edge cases", () => {
  it("formats with useIntlStyle", () => {
    const result = formatCurrency(1234.56, { useIntlStyle: true });
    expect(result).toContain("$");
    expect(result).toContain("1,234");
  });

  it("formats compact billions", () => {
    expect(formatCurrency(2_500_000_000, { compact: true })).toBe("$2.5B");
  });

  it("uses custom currency symbol", () => {
    const result = formatCurrency(100, { currencySymbol: "€" });
    expect(result).toContain("€");
    expect(result).not.toContain("$");
  });

  it("formats compact with custom compactDecimals", () => {
    expect(formatCurrency(1_234_000, { compact: true, compactDecimals: 2 })).toBe("$1.23M");
  });
});

describe("formatPrice edge cases", () => {
  it("formats with compact and currency combined", () => {
    const result = formatPrice(2_500_000, { compact: true, currency: true });
    expect(result).toBe("$2.5M");
  });

  it("formats with custom currency symbol", () => {
    const result = formatPrice(100.5, { currency: true, currencySymbol: "¥" });
    expect(result).toContain("¥");
  });

  it("returns custom nullDisplay for null", () => {
    expect(formatPrice(null, { nullDisplay: "N/A" })).toBe("N/A");
  });

  it("formats -Infinity as null display", () => {
    expect(formatPrice(-Infinity)).toBe("—");
  });
});

describe("formatDateTime edge cases", () => {
  it("returns dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("returns dash for empty string", () => {
    expect(formatDateTime("")).toBe("—");
  });
});

/* ------------------------------------------------------------------ */
/* Additional edge-case coverage (BL-136)                              */
/* ------------------------------------------------------------------ */

describe("formatNumber edge cases", () => {
  it("formats negative numbers with commas", () => {
    const result = formatNumber(-1234.5);
    expect(result).toContain("1,234");
    expect(result).toContain("-");
  });

  it("formats zero with custom decimals", () => {
    expect(formatNumber(0, 4)).toContain("0.0000");
  });

  it("formats very large numbers", () => {
    const result = formatNumber(1_000_000_000, 0);
    expect(result).toContain("1,000,000,000");
  });
});

describe("formatCurrency edge cases (BL-136)", () => {
  it("formats negative compact values", () => {
    expect(formatCurrency(-1_500_000, { compact: true })).toBe("$-1.5M");
    expect(formatCurrency(-2_300, { compact: true })).toBe("$-2.3K");
    expect(formatCurrency(-1_200_000_000, { compact: true })).toBe("$-1.2B");
  });

  it("uses smallValueDecimals for non-compact values in compact mode", () => {
    const result = formatCurrency(42.123, { compact: true, smallValueDecimals: 4 });
    expect(result).toContain("42");
  });

  it("formats with custom locale via useIntlStyle", () => {
    const result = formatCurrency(1234.56, { useIntlStyle: true, locale: "en-US", currency: "USD" });
    expect(result).toContain("1,234.56");
  });

  it("formats with custom minimumFractionDigits", () => {
    const result = formatCurrency(100, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    expect(result).toContain("100.0000");
  });

  it("formats zero with compact option (no suffix)", () => {
    const result = formatCurrency(0, { compact: true });
    expect(result).toContain("$");
    expect(result).toContain("0");
    expect(result).not.toContain("K");
    expect(result).not.toContain("M");
  });
});

describe("formatPrice edge cases (BL-136)", () => {
  it("formats compact thousands with currency", () => {
    expect(formatPrice(5_000, { compact: true, currency: true })).toBe("$5.0K");
  });

  it("formats compact billions with currency", () => {
    expect(formatPrice(2_000_000_000, { compact: true, currency: true })).toBe("$2.0B");
  });

  it("formats compact thousands without currency", () => {
    expect(formatPrice(5_000, { compact: true })).toBe("5.0K");
  });

  it("formats compact billions without currency", () => {
    expect(formatPrice(2_000_000_000, { compact: true })).toBe("2.0B");
  });

  it("formats negative compact values with currency", () => {
    expect(formatPrice(-1_500_000, { compact: true, currency: true })).toBe("$-1.5M");
  });

  it("formats negative compact values without currency", () => {
    expect(formatPrice(-1_500_000, { compact: true })).toBe("-1.5M");
  });

  it("formats with custom compactDecimals", () => {
    expect(formatPrice(1_234_000, { compact: true, compactDecimals: 2 })).toBe("1.23M");
  });

  it("formats zero", () => {
    const result = formatPrice(0);
    expect(result).toContain("0");
    expect(result).not.toBe("—");
  });

  it("formats negative zero as non-null", () => {
    expect(formatPrice(-0)).not.toBe("—");
  });

  it("formats with custom min/max fraction digits", () => {
    const result = formatPrice(1.23456789, { minimumFractionDigits: 0, maximumFractionDigits: 8 });
    expect(result).toContain("1.2345");
  });
});

describe("formatDuration edge cases (BL-136)", () => {
  it("formats exactly 60 seconds as 1m 0s", () => {
    expect(formatDuration(60)).toBe("1m 0s");
  });

  it("formats exactly 3600 seconds as 1h 0m", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
  });

  it("returns dash for NaN", () => {
    expect(formatDuration(NaN)).toBe("—");
  });

  it("returns dash for Infinity", () => {
    expect(formatDuration(Infinity)).toBe("—");
  });

  it("returns dash for -Infinity", () => {
    expect(formatDuration(-Infinity)).toBe("—");
  });

  it("formats timestamp pair where start equals end as 0m", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:00:00Z")).toBe("0m");
  });

  it("returns dash when end is before start", () => {
    expect(formatDuration("2026-01-01T12:00:00Z", "2026-01-01T10:00:00Z")).toBe("—");
  });

  it("returns dash for string with undefined endTime", () => {
    // endTime defaults to undefined → new Date("") → NaN
    expect(formatDuration("2026-01-01T10:00:00Z", undefined as unknown as string)).toBe("—");
  });

  it("formats short timestamp duration (under 60 minutes)", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:45:00Z")).toBe("45m");
  });

  it("rounds fractional seconds", () => {
    expect(formatDuration(0.4)).toBe("0s");
    expect(formatDuration(59.6)).toBe("60s");
  });
});

describe("formatPercent edge cases (BL-136)", () => {
  it("formats very large percent", () => {
    expect(formatPercent(999.999)).toBe("1000.00%");
  });

  it("formats with 0 decimals on negative", () => {
    expect(formatPercent(-50.9, 0)).toBe("-51%");
  });
});

describe("formatPnl edge cases (BL-136)", () => {
  it("handles very small positive values", () => {
    expect(formatPnl(0.001)).toBe("+0.00");
  });

  it("handles very small negative values", () => {
    expect(formatPnl(-0.001)).toBe("-0.00");
  });

  it("handles large positive values", () => {
    expect(formatPnl(99999.99)).toBe("+99999.99");
  });
});

describe("formatCompactCurrency edge cases (BL-136)", () => {
  it("formats exactly 1M boundary", () => {
    expect(formatCompactCurrency(1_000_000)).toBe("$1.0M");
  });

  it("formats negative small value", () => {
    expect(formatCompactCurrency(-42)).toBe("$-42");
  });

  it("formats value just below 1000", () => {
    expect(formatCompactCurrency(999.99)).toBe("$1000");
  });
});

describe("formatConfidence edge cases (BL-136)", () => {
  it("formats 100%", () => {
    expect(formatConfidence(100)).toBe("100.0%");
  });

  it("formats negative confidence", () => {
    expect(formatConfidence(-5.5)).toBe("-5.5%");
  });

  it("returns dash for -Infinity", () => {
    expect(formatConfidence(-Infinity)).toBe("—");
  });
});
