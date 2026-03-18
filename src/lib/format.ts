/**
 * Shared formatting utilities for the dashboard.
 */

export interface CurrencyFormatOptions {
  locale?: string;
  currencySymbol?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
  compactDecimals?: number;
  smallValueDecimals?: number;
  useIntlStyle?: boolean;
}

export interface PriceFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
  compactDecimals?: number;
  currency?: boolean;
  currencySymbol?: string;
  nullDisplay?: string;
}

function getCompactUnit(value: number): { divisor: number; suffix: string } | null {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return { divisor: 1_000_000_000, suffix: "B" };
  if (abs >= 1_000_000) return { divisor: 1_000_000, suffix: "M" };
  if (abs >= 1_000) return { divisor: 1_000, suffix: "K" };
  return null;
}

/** Format a number with commas and fixed decimal places (e.g. "1,234.56"). */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a number as currency with dollar sign (e.g. "$1,234.56"). */
export function formatCurrency(
  value: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale,
    currencySymbol = "$",
    currency = "USD",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
    compactDecimals = 1,
    smallValueDecimals = maximumFractionDigits,
    useIntlStyle = false,
  } = options;

  const compactUnit = compact ? getCompactUnit(value) : null;
  if (compactUnit) {
    return `${currencySymbol}${(value / compactUnit.divisor).toFixed(compactDecimals)}${compactUnit.suffix}`;
  }

  if (useIntlStyle) {
    return new Intl.NumberFormat(locale ?? "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }

  return (
    currencySymbol +
    value.toLocaleString(locale, {
      minimumFractionDigits: compact ? smallValueDecimals : minimumFractionDigits,
      maximumFractionDigits: compact ? smallValueDecimals : maximumFractionDigits,
    })
  );
}

/** Format a numeric price with optional currency symbol or compact suffixes. */
export function formatPrice(
  value: number | null | undefined,
  options: PriceFormatOptions = {}
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 6,
    compact = false,
    compactDecimals = 1,
    currency = false,
    currencySymbol = "$",
    nullDisplay = "—",
  } = options;

  if (value == null || !Number.isFinite(value)) {
    return nullDisplay;
  }

  const compactUnit = compact ? getCompactUnit(value) : null;
  if (compactUnit) {
    const prefix = currency ? currencySymbol : "";
    return `${prefix}${(value / compactUnit.divisor).toFixed(compactDecimals)}${compactUnit.suffix}`;
  }

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  return currency ? `${currencySymbol}${formatted}` : formatted;
}

/** Format either a duration in seconds or an elapsed time between two timestamps. */
export function formatDuration(value: number | null): string;
export function formatDuration(startTime: string, endTime: string): string;
export function formatDuration(
  valueOrStartTime: number | string | null,
  endTime?: string
): string {
  if (typeof valueOrStartTime === "string") {
    const start = new Date(valueOrStartTime).getTime();
    const end = new Date(endTime ?? "").getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      return "—";
    }

    const minutes = Math.round((end - start) / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  if (
    valueOrStartTime == null ||
    !Number.isFinite(valueOrStartTime) ||
    valueOrStartTime < 0
  ) {
    return "—";
  }

  if (valueOrStartTime < 60) {
    return `${Math.round(valueOrStartTime)}s`;
  }

  const minutes = Math.floor(valueOrStartTime / 60);
  const seconds = Math.round(valueOrStartTime % 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/** Format a number as a percentage string (e.g. "12.34%"). */
export function formatPercent(value: number, decimals: number = 2): string {
  return value.toFixed(decimals) + "%";
}

/** Format a PnL value with sign prefix (e.g. "+12.34" or "-5.67"). */
export function formatPnl(value: number): string {
  return (value >= 0 ? "+" : "") + value.toFixed(2);
}

/** Return a Tailwind color class based on PnL sign. */
export function colorByPnl(value: number): string {
  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

/** Format an ISO timestamp as a locale date+time string (null-safe). */
export function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

/** Format an ISO timestamp as a locale date string (null-safe). */
export function formatDate(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

/** Format an ISO timestamp as YYYY-MM-DD HH:mm in local time (null-safe). */
export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const pad = (value: number): string => String(value).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/** Format an ISO timestamp as a locale time string (null-safe). */
export function formatTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

/** Format a currency value with compact $K/$M/$B suffixes (for chart axes). */
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** Format a confidence value as percentage (null-safe, e.g. "75.0%"). */
export function formatConfidence(
  value: number | null | undefined
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

/** Format an ISO timestamp with en-US locale including seconds (e.g. "Jan 1, 12:30:45 PM"). */
export function formatTimestampVerbose(
  ts: string | null | undefined
): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Format an ISO timestamp as short date+time (e.g. "Jan 1, 12:30 PM"). */
export function formatDateShort(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
