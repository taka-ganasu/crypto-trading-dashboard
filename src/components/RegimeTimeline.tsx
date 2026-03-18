import type { DisplayCycle, RegimeType } from "@/components/CycleTable";
import { formatTimestamp } from "@/lib/format";

const regimeStyle: Record<
  RegimeType,
  { label: string; barClass: string; dotClass: string }
> = {
  trending: {
    label: "Trending",
    barClass: "bg-blue-500/80",
    dotClass: "bg-blue-400",
  },
  ranging: {
    label: "Ranging",
    barClass: "bg-zinc-500/80",
    dotClass: "bg-zinc-400",
  },
  high_vol: {
    label: "High Vol",
    barClass: "bg-red-500/80",
    dotClass: "bg-red-400",
  },
  macro_driven: {
    label: "Macro Driven",
    barClass: "bg-orange-500/80",
    dotClass: "bg-orange-400",
  },
  no_data: {
    label: "No regime data",
    barClass: "bg-zinc-700",
    dotClass: "bg-zinc-500",
  },
  unknown: {
    label: "Unknown",
    barClass: "bg-zinc-700",
    dotClass: "bg-zinc-500",
  },
};

const formatDateTime = formatTimestamp;

export default function RegimeTimeline({ cycles }: { cycles: DisplayCycle[] }) {
  return (
    <section
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
      data-testid="regime-timeline"
      role="img"
      aria-label="Regime transition timeline chart"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-200">Regime Transition Timeline</h2>

        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          {(["trending", "ranging", "high_vol", "macro_driven"] as const).map((key) => (
            <div key={key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${regimeStyle[key].dotClass}`} />
              <span>{regimeStyle[key].label}</span>
            </div>
          ))}
        </div>
      </div>

      {cycles.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No analysis cycles found</p>
      ) : (
        <>
          <div className="mt-4 flex h-7 overflow-hidden rounded-md border border-zinc-800">
            {cycles.map((cycle, index) => {
              const regime = regimeStyle[cycle.regime];
              const borderClass = index > 0 ? "border-l border-zinc-900/80" : "";
              return (
                <div
                  key={`${cycle.id}-${index}`}
                  className={`relative flex-1 ${regime.barClass} ${borderClass}`}
                  title={`#${cycle.id} ${regime.label} (${formatDateTime(cycle.startTime)})`}
                  aria-label={`cycle-${cycle.id}-${regime.label.toLowerCase().replace(/\s+/g, "-")}`}
                />
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
            {cycles.slice(-6).reverse().map((cycle) => {
              const regime = regimeStyle[cycle.regime];
              return (
                <div
                  key={`event-${cycle.id}`}
                  className="flex items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${regime.dotClass}`} />
                    <span className="text-zinc-300">{regime.label}</span>
                  </div>
                  <span className="font-mono text-zinc-500">#{cycle.id}</span>
                  <span className="text-zinc-500">{formatDateTime(cycle.startTime)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
