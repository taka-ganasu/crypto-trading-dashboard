/**
 * Shared formatting utilities for the dashboard.
 */

/** Format a number with commas and fixed decimal places (e.g. "1,234.56"). */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a number as currency with dollar sign (e.g. "$1,234.56"). */
export function formatCurrency(value: number): string {
  return "$" + formatNumber(value);
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

/** Format an ISO timestamp as a locale date+time string. */
export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

/** Format an ISO timestamp as a locale date string. */
export function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString();
}

/** Format an ISO timestamp as YYYY-MM-DD HH:mm in local time. */
export function formatDateTime(ts: string): string {
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

/** Format an ISO timestamp as a locale time string. */
export function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString();
}
