"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { fetchOnchainRegime } from "@/lib/api";
import type { OnchainRegimeData } from "@/types";

const OnchainMetricChart = dynamic(
  () => import("@/components/OnchainMetricChart"),
  { ssr: false }
);
const BtcSmaChart = dynamic(() => import("@/components/BtcSmaChart"), {
  ssr: false,
});

function regimeColor(regime: string): string {
  switch (regime) {
    case "BULL":
      return "text-emerald-400";
    case "WEAK_BEAR":
      return "text-amber-400";
    case "STRONG_BEAR":
      return "text-red-400";
    default:
      return "text-zinc-400";
  }
}

function regimeBgColor(regime: string): string {
  switch (regime) {
    case "BULL":
      return "bg-emerald-400/10 border-emerald-400/30";
    case "WEAK_BEAR":
      return "bg-amber-400/10 border-amber-400/30";
    case "STRONG_BEAR":
      return "bg-red-400/10 border-red-400/30";
    default:
      return "bg-zinc-800 border-zinc-700";
  }
}

function flagColor(isBear: boolean): string {
  return isBear ? "text-red-400" : "text-emerald-400";
}

function OnchainContent() {
  const [data, setData] = useState<OnchainRegimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchOnchainRegime();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-zinc-500">Loading onchain data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 rounded bg-zinc-700 px-3 py-1 text-sm text-zinc-200 hover:bg-zinc-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Regime Status Header */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Main Regime */}
        <div
          className={`rounded-lg border p-4 ${regimeBgColor(data.regime)}`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Regime Status
          </p>
          <p className={`mt-1 text-2xl font-bold ${regimeColor(data.regime)}`}>
            {data.regime}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Layer1: {data.layer1} | Layer1.5: {data.layer1_5}
          </p>
        </div>

        {/* Bear Flag Count */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Bear Flags
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">
            {data.bear_flag_count}/3
          </p>
          <div className="mt-1 flex gap-2 text-xs">
            <span className={flagColor(data.nupl_bear)}>
              NUPL {data.nupl_bear ? "BEAR" : "OK"}
            </span>
            <span className={flagColor(data.mvrv_bear)}>
              MVRV {data.mvrv_bear ? "BEAR" : "OK"}
            </span>
            <span className={flagColor(data.sopr_bear)}>
              SOPR {data.sopr_bear ? "BEAR" : "OK"}
            </span>
          </div>
        </div>

        {/* BTC vs 200SMA */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            BTC vs 200SMA
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-zinc-100">
              ${data.btc_price?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "N/A"}
            </span>
            <span className="text-xs text-zinc-500">
              SMA: ${data.btc_sma_200?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "N/A"}
            </span>
          </div>
          <p className={`mt-1 text-xs ${data.layer1 === "BULL" ? "text-emerald-400" : "text-red-400"}`}>
            {data.layer1 === "BULL" ? "Price above 200SMA" : "Price below 200SMA"}
          </p>
        </div>
      </div>

      {/* Latest Values */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">NUPL (threshold: 0.50)</p>
          <p className={`text-lg font-mono font-bold ${data.nupl_bear ? "text-red-400" : "text-emerald-400"}`}>
            {data.nupl_latest?.toFixed(4) ?? "N/A"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">MVRV (threshold: 1.50)</p>
          <p className={`text-lg font-mono font-bold ${data.mvrv_bear ? "text-red-400" : "text-emerald-400"}`}>
            {data.mvrv_latest?.toFixed(4) ?? "N/A"}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-400">SOPR 7d avg (threshold: 1.00)</p>
          <p className={`text-lg font-mono font-bold ${data.sopr_bear ? "text-red-400" : "text-emerald-400"}`}>
            {data.sopr_7d_latest?.toFixed(4) ?? "N/A"}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            NUPL (90d)
          </h3>
          <OnchainMetricChart
            data={data.nupl_series}
            threshold={0.5}
            label="NUPL"
            color="#34d399"
          />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            MVRV (90d)
          </h3>
          <OnchainMetricChart
            data={data.mvrv_series}
            threshold={1.5}
            label="MVRV"
            color="#60a5fa"
          />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            SOPR 7d Avg (90d)
          </h3>
          <OnchainMetricChart
            data={data.sopr_7d_series}
            threshold={1.0}
            label="SOPR 7d"
            color="#c084fc"
          />
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            BTC Price vs 200SMA (90d)
          </h3>
          <BtcSmaChart data={data.btc_price_series} />
        </div>
      </div>
    </div>
  );
}

export default function OnchainPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Onchain Regime</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Config G regime detection — NUPL / MVRV / SOPR + BTC 200SMA
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <p className="text-zinc-500">Loading...</p>
          </div>
        }
      >
        <OnchainContent />
      </Suspense>
    </div>
  );
}
