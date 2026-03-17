import type { SystemHealth } from "@/types";

type SysStatus = "OK" | "DEGRADED" | "DOWN" | "unreachable";
type GoLiveStatus = "ok" | "warning" | "error" | "unknown";

type GoLiveCheckItem = {
  name: string;
  status: GoLiveStatus;
  message: string;
  latencyMs: number | null;
};

const STATUS_CONFIG: Record<
  SysStatus,
  { color: string; bg: string; border: string; dot: string; label: string }
> = {
  OK: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
    label: "All systems operational",
  },
  DEGRADED: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-400",
    label: "Some services degraded",
  },
  DOWN: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-400",
    label: "System is down",
  },
  unreachable: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/30",
    dot: "bg-zinc-400",
    label: "Health monitor not running (API-only mode)",
  },
};

const GO_LIVE_STATUS_CONFIG: Record<
  GoLiveStatus,
  { label: string; color: string; dot: string; border: string; bg: string }
> = {
  ok: {
    label: "OK",
    color: "text-emerald-300",
    dot: "bg-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  warning: {
    label: "Warning",
    color: "text-yellow-300",
    dot: "bg-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
  },
  error: {
    label: "Error",
    color: "text-red-300",
    dot: "bg-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
  },
  unknown: {
    label: "Unknown",
    color: "text-zinc-300",
    dot: "bg-zinc-400",
    border: "border-zinc-700",
    bg: "bg-zinc-800/40",
  },
};

function StatusBadge({ status }: { status: SysStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold ${config.color} ${config.bg} border ${config.border}`}
    >
      <span className={`h-3 w-3 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

function formatConnectivity(value: boolean | null | undefined): string {
  if (value === true) return "Connected";
  if (value === false) return "Disconnected";
  return "—";
}

export interface HealthSectionProps {
  loading: boolean;
  systemError: string | null;
  status: SysStatus;
  health: SystemHealth | null;
  goLiveChecks: GoLiveCheckItem[];
}

export default function HealthSection({
  loading,
  systemError,
  status,
  health,
  goLiveChecks,
}: HealthSectionProps) {
  const config = STATUS_CONFIG[status];

  return (
    <>
      <div className={`rounded-xl border ${config.border} ${config.bg} p-6`}>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
          System Status
        </p>
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 animate-pulse rounded-full bg-zinc-800" />
          </div>
        ) : systemError ? (
          <div className="text-sm text-red-400">
            <p>Failed to load some system data</p>
            <p className="text-xs text-zinc-500 mt-1">{systemError}</p>
          </div>
        ) : (
          <>
            <StatusBadge status={status} />
            <p className={`mt-3 text-sm ${config.color}`}>{config.label}</p>
            <div className="mt-4 flex items-center gap-6 text-sm text-zinc-400">
              <span>
                DB:{" "}
                <span className="text-zinc-200 font-medium">
                  {formatConnectivity(health?.db_connected)}
                </span>
              </span>
              <span>
                Exchange:{" "}
                <span className="font-mono text-zinc-200">
                  {formatConnectivity(health?.exchange_connected)}
                </span>
              </span>
            </div>
          </>
        )}
      </div>

      <div
        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        data-testid="go-live-checklist"
      >
        <h2 className="text-lg font-semibold text-zinc-200 mb-1">Go-Live Checklist</h2>
        <p className="text-xs text-zinc-500 mb-4">Data source: /api/health checks</p>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-800" />
            ))}
          </div>
        ) : goLiveChecks.length === 0 ? (
          <p className="text-sm text-zinc-400">No checks available from /api/health.</p>
        ) : (
          <div className="space-y-3">
            {goLiveChecks.map((check, index) => {
              const statusConfig = GO_LIVE_STATUS_CONFIG[check.status];
              return (
                <div
                  key={`${check.name}-${index}`}
                  className={`rounded-lg border px-4 py-3 ${statusConfig.border} ${statusConfig.bg}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm text-zinc-100">{check.name}</p>
                      <p className="mt-1 text-sm text-zinc-300">{check.message}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border border-zinc-700/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusConfig.color}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">
                    Latency:{" "}
                    {check.latencyMs != null ? `${check.latencyMs.toFixed(2)} ms` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
