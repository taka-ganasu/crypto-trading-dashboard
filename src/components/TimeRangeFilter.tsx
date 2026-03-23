"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export type TimeRange = "24h" | "7d" | "30d" | "90d" | "all";

const RANGES: { key: TimeRange; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

const RANGE_MS: Record<TimeRange, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  all: null,
};

function isTimeRange(value: string | null): value is TimeRange {
  return value != null && RANGES.some((r) => r.key === value);
}

export function getTimeRangeDates(range: TimeRange): {
  start?: string;
  end?: string;
} {
  const ms = RANGE_MS[range];
  if (ms == null) return {};
  const now = new Date();
  const start = new Date(now.getTime() - ms);
  return { start: start.toISOString(), end: now.toISOString() };
}

export function useTimeRange(): {
  range: TimeRange;
  start?: string;
  end?: string;
} {
  const searchParams = useSearchParams();
  const raw = searchParams.get("range");
  const range: TimeRange = isTimeRange(raw) ? raw : "7d";
  return { range, ...getTimeRangeDates(range) };
}

export default function TimeRangeFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const raw = searchParams.get("range");
  const currentRange: TimeRange = isTimeRange(raw) ? raw : "7d";

  const buildHref = (range: TimeRange): string => {
    const params = new URLSearchParams(searchParams.toString());
    if (range === "7d") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="flex gap-1" role="group" aria-label="Time range filter">
      {RANGES.map(({ key, label }) => (
        <Link
          key={key}
          href={buildHref(key)}
          role="button"
          aria-pressed={currentRange === key}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            currentRange === key
              ? "bg-zinc-700 text-zinc-100"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
