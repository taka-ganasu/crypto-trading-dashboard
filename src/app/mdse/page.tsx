"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import {
  fetchMdseSummary,
  fetchMdseEvents,
  fetchMdseTrades,
  fetchMdseTimeline,
} from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTimeRange } from "@/components/TimeRangeFilter";
import MdseOverview from "@/components/mdse/MdseOverview";
import MdseDetectorTimeline from "@/components/mdse/MdseDetectorTimeline";
import MdseEvents from "@/components/mdse/MdseEvents";
import MdseTrades from "@/components/mdse/MdseTrades";
import type { MdseSummaryDetector, MdseEvent, MdseTrade, MdseTimeline } from "@/types";

const EVENTS_PAGE_SIZE = 50;

export default function MdsePage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading MDSE data..." />}>
      <MdseContent />
    </Suspense>
  );
}

function MdseContent() {
  const [detectors, setDetectors] = useState<MdseSummaryDetector[]>([]);
  const [events, setEvents] = useState<MdseEvent[]>([]);
  const [trades, setTrades] = useState<MdseTrade[]>([]);
  const [timeline, setTimeline] = useState<MdseTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageLoading, setEventsPageLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const { start, end } = useTimeRange();

  const loadEvents = useCallback(async (page: number) => {
    const offset = (page - 1) * EVENTS_PAGE_SIZE;
    const result = await fetchMdseEvents(24, start, end, EVENTS_PAGE_SIZE, offset);
    setEvents(result);
    setHasNextPage(result.length === EVENTS_PAGE_SIZE);
    return result;
  }, [start, end]);

  const loadMdseData = useCallback(async () => {
    setLoading(true);
    setEventsPage(1);
    const [summaryResult, eventsResult, tradesResult, timelineResult] =
      await Promise.allSettled([
        fetchMdseSummary(),
        loadEvents(1),
        fetchMdseTrades(20, start, end),
        fetchMdseTimeline(24, start, end),
      ]);

    const failedSections: string[] = [];
    let criticalFailures = 0;

    if (summaryResult.status === "fulfilled") {
      setDetectors(summaryResult.value.detectors ?? []);
    } else {
      setDetectors([]);
      failedSections.push("detector summary");
      criticalFailures += 1;
    }

    if (eventsResult.status === "rejected") {
      setEvents([]);
      failedSections.push("recent events");
      criticalFailures += 1;
    }

    if (tradesResult.status === "fulfilled") {
      setTrades(tradesResult.value);
    } else {
      setTrades([]);
      failedSections.push("trades");
      criticalFailures += 1;
    }

    if (timelineResult.status === "fulfilled") {
      setTimeline(timelineResult.value);
    } else {
      setTimeline(null);
      failedSections.push("timeline chart");
    }

    if (criticalFailures >= 3) {
      setError("Failed to load MDSE data.");
      setWarning(null);
    } else if (failedSections.length > 0) {
      setError(null);
      setWarning(
        `Some sections failed to load: ${failedSections.join(", ")}. Showing available data.`
      );
    } else {
      setError(null);
      setWarning(null);
    }

    setLoading(false);
  }, [start, end, loadEvents]);

  const handleEventsPageChange = useCallback(async (page: number) => {
    setEventsPageLoading(true);
    try {
      await loadEvents(page);
      setEventsPage(page);
    } catch {
      // Keep current page on error
    } finally {
      setEventsPageLoading(false);
    }
  }, [loadEvents]);

  useEffect(() => {
    queueMicrotask(() => { void loadMdseData(); });
  }, [loadMdseData]);

  if (loading) {
    return <LoadingSpinner label="Loading MDSE data..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center" role="alert" aria-live="assertive">
          <p className="text-red-400">Error: {error}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); void loadMdseData(); }}
            className="mt-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {warning && (
        <div
          className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-300"
          role="status"
          aria-live="polite"
        >
          {warning}
        </div>
      )}

      <MdseOverview detectors={detectors} />
      <MdseDetectorTimeline timeline={timeline} />
      <MdseEvents
        events={events}
        currentPage={eventsPage}
        hasNextPage={hasNextPage}
        onPageChange={handleEventsPageChange}
        pageLoading={eventsPageLoading}
      />
      <MdseTrades trades={trades} events={events} />
    </div>
  );
}
