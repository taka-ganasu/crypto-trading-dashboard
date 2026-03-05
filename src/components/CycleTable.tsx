export type RegimeType =
  | "trending"
  | "ranging"
  | "high_vol"
  | "macro_driven"
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
  unknown: "Unknown",
};

const regimeTextClassMap: Record<RegimeType, string> = {
  trending: "text-blue-400",
  ranging: "text-zinc-300",
  high_vol: "text-red-400",
  macro_driven: "text-orange-400",
  unknown: "text-zinc-500",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function formatConfidence(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDuration(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value < 0) return "—";
  if (value < 60) return `${Math.round(value)}s`;

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default function CycleTable({ cycles }: { cycles: DisplayCycle[] }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Cycle Table</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/90 text-left text-xs uppercase tracking-wider text-zinc-500">
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
            {cycles.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  No analysis cycles found
                </td>
              </tr>
            ) : (
              cycles.map((cycle) => (
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
    </div>
  );
}
