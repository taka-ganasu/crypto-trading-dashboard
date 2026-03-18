import { useState } from "react";
import { formatConfidence, formatDuration, formatTimestamp } from "@/lib/format";

export type RegimeType =
  | "trending"
  | "ranging"
  | "high_vol"
  | "macro_driven"
  | "no_data"
  | "unknown";

export interface DisplayCycle {
  id: number;
  startTime: string | null;
  endTime: string | null;
  signalsGenerated: number;
  tradesExecuted: number;
  durationSeconds: number | null;
  regime: RegimeType;
  confidence: number | null;
}

const regimeLabelMap: Record<RegimeType, string> = {
  trending: "Trending",
  ranging: "Ranging",
  high_vol: "High Vol",
  macro_driven: "Macro Driven",
  no_data: "No regime data",
  unknown: "Unknown",
};

const regimeTextClassMap: Record<RegimeType, string> = {
  trending: "text-blue-400",
  ranging: "text-zinc-300",
  high_vol: "text-red-400",
  macro_driven: "text-orange-400",
  no_data: "text-zinc-500",
  unknown: "text-zinc-500",
};

const formatDateTime = formatTimestamp;

const PAGE_SIZE = 25;

export default function CycleTable({ cycles }: { cycles: DisplayCycle[] }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(cycles.length / PAGE_SIZE));
  const paginatedCycles = cycles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 when cycles change (render-phase adjustment)
  const [prevCycles, setPrevCycles] = useState(cycles);
  if (cycles !== prevCycles) {
    setPrevCycles(cycles);
    setCurrentPage(1);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Cycle Table</h2>
        <span className="text-xs text-zinc-500">{cycles.length} cycles</span>
      </div>

      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm" aria-label="Cycle table">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-800 bg-zinc-900 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3 text-right">Signals</th>
              <th className="px-4 py-3 text-right">Executed</th>
              <th className="px-4 py-3">Regime</th>
              <th className="px-4 py-3 text-right">Avg Confidence</th>
              <th className="px-4 py-3 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {paginatedCycles.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No analysis cycles found
                </td>
              </tr>
            ) : (
              paginatedCycles.map((cycle) => (
                <tr key={cycle.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-300">#{cycle.id}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDateTime(cycle.startTime)}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDateTime(cycle.endTime)}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">{cycle.signalsGenerated}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">{cycle.tradesExecuted}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${regimeTextClassMap[cycle.regime]}`}>
                      {regimeLabelMap[cycle.regime]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {formatConfidence(cycle.confidence)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {formatDuration(cycle.durationSeconds)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
