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

  it("formats elapsed timestamp duration under one hour as minutes only", () => {
    const result = formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:45:00Z");
    expect(result).toBe("45m");
  });

  it("returns dash for invalid timestamp pair", () => {
    expect(formatDuration("invalid", "also-invalid")).toBe("—");
  });

  it("returns dash when end timestamp is before start timestamp", () => {
    expect(
      formatDuration("2026-01-01T11:00:00Z", "2026-01-01T10:00:00Z")
    ).toBe("—");
  });

  it("returns dash when end timestamp is omitted", () => {
    expect(formatDuration("2026-01-01T11:00:00Z")).toBe("—");
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
