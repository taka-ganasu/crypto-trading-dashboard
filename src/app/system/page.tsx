"use client";

import { Suspense } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import HealthSection from "@/components/system/HealthSection";
import MetricsSection from "@/components/system/MetricsSection";
import ConfigSection from "@/components/system/ConfigSection";
import ErrorLogSection from "@/components/system/ErrorLogSection";
import packageJson from "../../../package.json";
import { useSystemData } from "./useSystemData";

const DASHBOARD_VERSION = packageJson.version as string;

export default function SystemPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading system data..." />}>
      <SystemContent />
    </Suspense>
  );
}

function SystemContent() {
  const data = useSystemData();

  if (data.loading && !data.health && !data.metrics && !data.info && !data.systemError) {
    return <LoadingSpinner label="Loading system data..." />;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">System</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Process health, resource usage, and API information
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
        <button
          type="button"
          data-testid="system-tab-info"
          onClick={() => data.setActiveTab("info")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            data.activeTab === "info"
              ? "bg-cyan-500/20 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          System Info
        </button>
        <button
          type="button"
          data-testid="system-tab-error-log"
          onClick={() => data.setActiveTab("errors")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            data.activeTab === "errors"
              ? "bg-cyan-500/20 text-cyan-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Error Log
        </button>
      </div>

      {data.activeTab === "info" ? (
        <>
          <HealthSection
            loading={data.loading}
            systemError={data.systemError}
            status={data.status}
            health={data.health}
            goLiveChecks={data.goLiveChecks}
          />
          <MetricsSection loading={data.loading} metrics={data.metrics} />
          <ConfigSection
            loading={data.loading}
            botVersionFromHealth={data.botVersionFromHealth}
            vpsHead={data.vpsHead}
            mainHead={data.mainHead}
            isHeadDrift={data.isHeadDrift}
            info={data.info}
            dashboardVersion={DASHBOARD_VERSION}
          />
        </>
      ) : (
        <ErrorLogSection
          loading={data.loading}
          errorLogError={data.errorLogError}
          apiErrors={data.apiErrors}
          expandedTraceKey={data.expandedTraceKey}
          onToggleTrace={data.toggleTrace}
        />
      )}
    </div>
  );
}
