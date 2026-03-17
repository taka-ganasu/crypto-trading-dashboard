import type { SystemInfo } from "@/types";

export interface ConfigSectionProps {
  loading: boolean;
  botVersionFromHealth: string | null;
  vpsHead: string | null;
  mainHead: string | null;
  isHeadDrift: boolean;
  info: SystemInfo | null;
  dashboardVersion: string;
}

export default function ConfigSection({
  loading,
  botVersionFromHealth,
  vpsHead,
  mainHead,
  isHeadDrift,
  info,
  dashboardVersion,
}: ConfigSectionProps) {
  return (
    <>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4" data-testid="vps-version-heading">
          VPS Version
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-zinc-800 w-64" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Bot Version (/api/health)</span>
              <span className="font-mono text-sm text-zinc-200" data-testid="vps-bot-version-value">
                {botVersionFromHealth ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">VPS HEAD</span>
              <span className="font-mono text-sm text-zinc-200" data-testid="vps-head-value">
                {vpsHead ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">main HEAD</span>
              <span className="font-mono text-sm text-zinc-200" data-testid="main-head-value">
                {mainHead ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Sync Status</span>
              <span
                className={`text-sm font-semibold ${
                  isHeadDrift ? "text-yellow-300" : "text-emerald-300"
                }`}
                data-testid="head-sync-status"
              >
                {vpsHead && mainHead ? (isHeadDrift ? "DRIFT" : "IN_SYNC") : "UNKNOWN"}
              </span>
            </div>
            {isHeadDrift ? (
              <p className="text-sm text-yellow-300">
                Warning: VPS HEAD differs from main HEAD.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4" data-testid="api-info-heading">
          API Information
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-zinc-800 w-64" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">API Version</span>
              <span className="font-mono text-sm text-zinc-200" data-testid="api-version-value">
                {info?.api_version ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Bot Version</span>
              <span className="font-mono text-sm text-zinc-200" data-testid="bot-version-value">
                {info?.bot_version ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Dashboard Version</span>
              <span className="font-mono text-sm text-zinc-200" data-testid="dashboard-version-value">
                {dashboardVersion}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Database Path</span>
              <span className="font-mono text-sm text-zinc-200 truncate ml-4 max-w-xs">
                {info?.db_path ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="text-sm text-zinc-400">Python Version</span>
              <span className="font-mono text-sm text-zinc-200">
                {info?.python_version ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
