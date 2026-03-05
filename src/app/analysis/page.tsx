"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import CycleTable, { type DisplayCycle, type RegimeType } from "@/components/CycleTable";
import RegimeTimeline from "@/components/RegimeTimeline";
import { fetchAnalysisCycles } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { AnalysisCycle } from "@/types";

type ParsedRegime = {
  regime: RegimeType;
  confidence: number | null;
};

const KNOWN_REGIMES: RegimeType[] = [
  "trending",
  "ranging",
  "high_vol",
  "macro_driven",
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

function coerceConfidencePercent(raw: number | null): number | null {
  if (raw == null || !Number.isFinite(raw)) {
    return null;
  }
  if (raw >= 0 && raw <= 1) {
    return raw * 100;
  }
  return raw;
}

function parseRegimeFromObject(obj: Record<string, unknown>): ParsedRegime {
  const regime = normalizeRegime(
    obj.regime ?? obj.current_regime ?? obj.market_regime ?? obj.regime_type ?? obj.name
  );

  const confidenceRaw =
    asFiniteNumber(obj.avg_confidence) ??
    asFiniteNumber(obj.average_confidence) ??
    asFiniteNumber(obj.confidence) ??
    asFiniteNumber(obj.regime_confidence);

  return {
    regime,
    confidence: coerceConfidencePercent(confidenceRaw),
  };
}

function parseRegimeInfo(value: string | null): ParsedRegime {
  if (!value) {
    return { regime: "unknown", confidence: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { regime: "unknown", confidence: null };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAnalysisCycles(100)
      .then((data) => {
        setCycles(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const displayCycles = useMemo(() => {
    return cycles.map(toDisplayCycle).sort(compareCycles);
  }, [cycles]);

  const stats = useMemo(() => {
    const totalCycles = displayCycles.length;
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
  }, [displayCycles]);

  if (loading) {
    return <LoadingSpinner label="Loading analysis..." />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Analysis</h1>
        <span className="text-sm text-zinc-500">{stats.totalCycles} cycles</span>
      </div>

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
