"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import CycleTable, { type DisplayCycle, type RegimeType } from "@/components/CycleTable";
import RegimeTimeline from "@/components/RegimeTimeline";
import { fetchAnalysisCycles, fetchRegimeData } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import TimeRangeFilter, { useTimeRange } from "@/components/TimeRangeFilter";
import type { AnalysisCycle, RegimeData } from "@/types";

type ParsedRegime = {
  regime: RegimeType;
  confidence: number | null;
};

const KNOWN_REGIMES: RegimeType[] = [
  "trending",
  "ranging",
  "high_vol",
  "macro_driven",
  "no_data",
  "unknown",
];

const REGIME_ALIAS: Record<string, RegimeType> = {
  trend: "trending",
  trending: "trending",
  bullish: "trending",
  range: "ranging",
  ranging: "ranging",
  sideways: "ranging",
  high_vol: "high_vol",
  highvol: "high_vol",
  volatile: "high_vol",
  volatility: "high_vol",
  macro: "macro_driven",
  macro_driven: "macro_driven",
  macrodriven: "macro_driven",
  macro_event: "macro_driven",
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeRegime(value: unknown): RegimeType {
  if (typeof value !== "string") {
    return "unknown";
  }

  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key in REGIME_ALIAS) {
    return REGIME_ALIAS[key];
  }
  if (KNOWN_REGIMES.includes(key as RegimeType)) {
    return key as RegimeType;
  }
  return "unknown";
}

function coerceConfidencePercent(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) {
    return null;
  }
  if (raw >= 0 && raw <= 1) {
    return raw * 100;
  }
  return raw;
}

function parseRegimeFromObject(obj: Record<string, unknown>): ParsedRegime {
  // Direct regime key (e.g. {"regime": "trending", "confidence": 0.8})
  const directRegime =
    obj.regime ?? obj.current_regime ?? obj.market_regime ?? obj.regime_type ?? obj.name;

  if (directRegime !== undefined) {
    const regime = normalizeRegime(directRegime);
    const confidenceRaw =
      asFiniteNumber(obj.avg_confidence) ??
      asFiniteNumber(obj.average_confidence) ??
      asFiniteNumber(obj.confidence) ??
      asFiniteNumber(obj.regime_confidence);
    return { regime, confidence: coerceConfidencePercent(confidenceRaw) };
  }

  // Per-symbol format (e.g. {"BTC/USDT": {"regime": "trending", ...}, "SOL/USDT": ...})
  const values = Object.values(obj);
  if (values.length > 0 && values[0] && typeof values[0] === "object") {
    const first = values[0] as Record<string, unknown>;
    const regime = normalizeRegime(first.regime ?? first.regime_type);
    const confidenceRaw = asFiniteNumber(first.confidence);
    return { regime, confidence: coerceConfidencePercent(confidenceRaw) };
  }

  return { regime: "unknown", confidence: null };
}

function parseRegimeInfo(value: string | null): ParsedRegime {
  if (!value) {
    return { regime: "no_data", confidence: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { regime: "no_data", confidence: null };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      return { regime: normalizeRegime(parsed), confidence: null };
    }
    if (parsed && typeof parsed === "object") {
      return parseRegimeFromObject(parsed as Record<string, unknown>);
    }
  } catch {
    const confidenceFromRaw = coerceConfidencePercent(asFiniteNumber(trimmed));
    if (confidenceFromRaw != null) {
      return { regime: "unknown", confidence: confidenceFromRaw };
    }
  }

  return { regime: normalizeRegime(trimmed), confidence: null };
}

function toDisplayCycle(cycle: AnalysisCycle): DisplayCycle {
  const parsed = parseRegimeInfo(cycle.regime_info ?? null);
  return {
    id: asFiniteNumber(cycle.id) ?? 0,
    startTime: cycle.start_time ?? null,
    endTime: cycle.end_time ?? null,
    signalsGenerated: asFiniteNumber(cycle.signals_generated) ?? 0,
    tradesExecuted: asFiniteNumber(cycle.trades_executed) ?? 0,
    durationSeconds: asFiniteNumber(cycle.duration_seconds),
    regime: parsed.regime,
    confidence: parsed.confidence,
  };
}

function compareCycles(a: DisplayCycle, b: DisplayCycle): number {
  const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
  const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
  return aTime - bTime;
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading analysis..." />}>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const [cycles, setCycles] = useState<AnalysisCycle[]>([]);
  const [regimeData, setRegimeData] = useState<RegimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { start, end } = useTimeRange();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cycleData, regime] = await Promise.all([
          fetchAnalysisCycles(100, start, end),
          fetchRegimeData().catch(() => [] as RegimeData[]),
        ]);
        setCycles(Array.isArray(cycleData) ? cycleData : []);
        setRegimeData(Array.isArray(regime) ? regime : []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [start, end]);

  const displayCycles = useMemo(() => {
    return cycles.map(toDisplayCycle).sort(compareCycles);
  }, [cycles]);

  const stats = useMemo(() => {
    const totalCycles =
      asFiniteNumber(cycles[0]?.total_count) ?? displayCycles.length;
    const totalSignals = displayCycles.reduce((sum, cycle) => sum + cycle.signalsGenerated, 0);
    const totalExecuted = displayCycles.reduce((sum, cycle) => sum + cycle.tradesExecuted, 0);

    const executionRate =
      totalSignals > 0 ? ((totalExecuted / totalSignals) * 100).toFixed(1) : "0.0";

    const confidenceValues = displayCycles
      .map((cycle) => cycle.confidence)
      .filter((value): value is number => value != null && Number.isFinite(value));

    const avgConfidence =
      confidenceValues.length > 0
        ? (confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(1)
        : null;

    return {
      totalCycles,
      totalSignals,
      totalExecuted,
      executionRate,
      avgConfidence,
    };
  }, [cycles, displayCycles]);

  if (loading) {
    return <LoadingSpinner label="Loading analysis..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Analysis</h1>
        <div className="flex items-center gap-4">
          <TimeRangeFilter />
          <span className="text-sm text-zinc-500">{stats.totalCycles} cycles</span>
        </div>
      </div>

      {error && (
        <div
          className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          role="alert"
        >
          Data unavailable: {error}
        </div>
      )}

      {regimeData.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Live Market Regime
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {regimeData.map((r) => (
              <RegimeCard key={r.symbol} data={r} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Cycles" value={String(stats.totalCycles)} />
        <StatCard label="Total Signals" value={String(stats.totalSignals)} />
        <StatCard label="Signal Execution Rate" value={`${stats.executionRate}%`} />
        <StatCard
          label="Avg Confidence"
          value={stats.avgConfidence != null ? `${stats.avgConfidence}%` : "—"}
        />
      </div>

      <RegimeTimeline cycles={displayCycles} />
      <CycleTable cycles={displayCycles} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold text-zinc-100">{value}</p>
    </div>
  );
}

const REGIME_COLORS: Record<string, string> = {
  trending: "text-green-400 border-green-500/40 bg-green-500/10",
  ranging: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  high_volatility: "text-red-400 border-red-500/40 bg-red-500/10",
  macro_driven: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
};

const REGIME_LABELS: Record<string, string> = {
  trending: "Trending",
  ranging: "Ranging",
  high_volatility: "High Volatility",
  macro_driven: "Macro Driven",
};

function RegimeCard({ data }: { data: RegimeData }) {
  const colors = REGIME_COLORS[data.regime] ?? "text-zinc-400 border-zinc-700 bg-zinc-800";
  const label = REGIME_LABELS[data.regime] ?? data.regime;

  return (
    <div className={`rounded-lg border p-4 ${colors}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{data.symbol}</span>
        <span className="text-xs font-bold uppercase">{label}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] uppercase text-zinc-500">ADX</p>
          <p className="font-mono text-sm font-semibold text-zinc-200">{data.adx.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-zinc-500">ATR-Z</p>
          <p className="font-mono text-sm font-semibold text-zinc-200">{data.atr_zscore.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-zinc-500">Corr</p>
          <p className="font-mono text-sm font-semibold text-zinc-200">{data.correlation.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
