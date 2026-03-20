"use client";

import { formatTimestamp } from "@/lib/format";
import type { MdseEvent } from "@/types";

function toPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value <= 1 ? value * 100 : value;
}

function isLongDirection(direction: string | null | undefined): boolean {
  const normalized = (direction ?? "").toLowerCase();
  return normalized === "long" || normalized === "buy";
}

function detectorLabel(event: MdseEvent | null | undefined): string {
  if (!event) return "—";
  return event.detector ?? event.detector_name ?? "—";
}

interface MdseEventsProps {
  events: MdseEvent[];
  currentPage?: number;
  hasNextPage?: boolean;
  onPageChange?: (page: number) => void;
  pageLoading?: boolean;
}

export default function MdseEvents({
  events,
  currentPage = 1,
  hasNextPage = false,
  onPageChange,
  pageLoading = false,
}: MdseEventsProps) {
  const showPagination = onPageChange && (currentPage > 1 || hasNextPage);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">
          Recent Events
        </h2>
        <span className="text-sm text-zinc-500">
          {pageLoading ? "Loading..." : `${events.length} events`}
          {showPagination && ` · Page ${currentPage}`}
        </span>
      </div>
      <div className="space-y-2">
        {events.length === 0 && !pageLoading ? (
          <p className="text-center text-zinc-500 py-8">
            No events found
          </p>
        ) : (
          events.map((ev) => {
            const confidencePct = Math.min(Math.max(toPercent(ev.confidence), 0), 100);
            return (
              <div
                key={ev.id}
                className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                  {detectorLabel(ev)}
                </span>
                <span className="text-sm font-medium text-zinc-200 w-20">
                  {ev.symbol}
                </span>
                <span
                  className={`text-sm font-medium w-14 ${
                    isLongDirection(ev.direction)
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {ev.direction.toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className={`h-2 rounded-full ${
                        confidencePct >= 70
                          ? "bg-emerald-500"
                          : confidencePct >= 40
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-mono text-zinc-500">
                  {confidencePct.toFixed(1)}%
                </span>
                <span className="shrink-0 text-xs text-zinc-500 w-36 text-right">
                  {formatTimestamp(ev.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {showPagination && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {currentPage}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || pageLoading}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || pageLoading}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
