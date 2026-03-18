import { Fragment } from "react";
import { formatTimestampVerbose as formatTimestamp } from "@/lib/format";
import type { ApiError } from "@/types";

function normalizeStatusCode(statusCode: number | null | undefined): number {
  return typeof statusCode === "number" && Number.isFinite(statusCode)
    ? statusCode
    : 0;
}

function errorRowClass(statusCode: number): string {
  if (statusCode >= 500) {
    return "bg-red-500/10";
  }
  if (statusCode >= 400) {
    return "bg-yellow-500/10";
  }
  return "bg-zinc-900/40";
}

export interface ErrorLogSectionProps {
  loading: boolean;
  errorLogError: string | null;
  apiErrors: ApiError[];
  expandedTraceKey: string | null;
  onToggleTrace: (key: string) => void;
}

export default function ErrorLogSection({
  loading,
  errorLogError,
  apiErrors,
  expandedTraceKey,
  onToggleTrace,
}: ErrorLogSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-200">Error Log</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Last 24h API errors (status code &gt;= 400, max 50 records)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      ) : errorLogError ? (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <p>Failed to load API error logs.</p>
          <p className="mt-1 text-xs text-zinc-400">{errorLogError}</p>
        </div>
      ) : apiErrors.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">No API errors found for the selected range.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm" data-testid="error-log-table">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Path</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {apiErrors.map((entry, index) => {
                const statusCode = normalizeStatusCode(entry.status_code);
                const rowClass = errorRowClass(statusCode);
                const traceKey = `${entry.ts}-${entry.path}-${index}`;
                const traceExpanded = expandedTraceKey === traceKey;
                const hasTraceback = Boolean(entry.traceback);

                return (
                  <Fragment key={traceKey}>
                    <tr className={`border-b border-zinc-800/70 ${rowClass}`} data-testid="error-log-row">
                      <td className="px-3 py-2 whitespace-nowrap text-zinc-200">
                        {formatTimestamp(entry.ts)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-md border border-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-100">
                          {statusCode || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono uppercase text-zinc-200">
                        {entry.method || "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{entry.path || "—"}</td>
                      <td className="px-3 py-2 text-zinc-200">
                        <p>{entry.detail || "—"}</p>
                        {hasTraceback ? (
                          <button
                            type="button"
                            className="mt-1 text-xs text-cyan-300 hover:text-cyan-200"
                            onClick={() => onToggleTrace(traceKey)}
                          >
                            {traceExpanded ? "Hide traceback" : "Show traceback"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {traceExpanded && hasTraceback ? (
                      <tr className="border-b border-zinc-800/70 bg-zinc-950/60">
                        <td className="px-3 py-3" colSpan={5}>
                          <p className="mb-2 text-xs text-zinc-400">
                            {entry.exc_type ? `Exception: ${entry.exc_type}` : "Traceback"}
                          </p>
                          <pre
                            className="max-h-64 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300"
                            data-testid="error-traceback"
                          >
                            {entry.traceback}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
