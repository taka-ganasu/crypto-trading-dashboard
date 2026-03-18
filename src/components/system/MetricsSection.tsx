import { formatTimestampVerbose as formatTimestamp } from "@/lib/format";
import type { SystemMetrics } from "@/types";

function formatWebSocketStatus(value: boolean | null | undefined): {
  label: string;
  dotClass: string;
} {
  if (value === true) {
    return { label: "Connected", dotClass: "bg-emerald-400" };
  }
  if (value === false) {
    return { label: "Disconnected", dotClass: "bg-red-400" };
  }
  return { label: "Unknown", dotClass: "bg-zinc-500" };
}

function formatOpenPositions(value: number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "—";
}

export interface MetricsSectionProps {
  loading: boolean;
  metrics: SystemMetrics | null;
}

export default function MetricsSection({ loading, metrics }: MetricsSectionProps) {
  const wsStatus = formatWebSocketStatus(metrics?.ws_connected);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">Resource Metrics</h2>
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Memory</p>
            <p className="mt-2 text-xl font-bold text-zinc-100">
              {metrics?.memory_mb?.toFixed(1) ?? "—"}{" "}
              <span className="text-sm font-normal text-zinc-500">MB</span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">CPU</p>
            <p className="mt-2 text-xl font-bold text-zinc-100">
              {metrics?.cpu_percent?.toFixed(1) ?? "—"}
              <span className="text-sm font-normal text-zinc-500">%</span>
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">WebSocket</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${wsStatus.dotClass}`} />
              <span className="text-xl font-bold text-zinc-100">
                {wsStatus.label}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Last FR Fetch
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-200">
              {formatTimestamp(metrics?.last_fr_fetch ?? null)}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Open Positions
            </p>
            <p className="mt-2 text-xl font-bold text-zinc-100">
              {formatOpenPositions(metrics?.open_positions)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
