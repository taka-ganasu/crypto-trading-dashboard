"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { ExecutionMode } from "@/types";

const MODES: { key: ExecutionMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "paper", label: "Paper" },
  { key: "dry_run", label: "Dry-run" },
];

function isExecutionMode(value: string | null): value is ExecutionMode {
  return value != null && MODES.some((mode) => mode.key === value);
}

export function useExecutionMode(): {
  executionMode: ExecutionMode;
  apiExecutionMode: Exclude<ExecutionMode, "all"> | undefined;
} {
  const searchParams = useSearchParams();
  const raw = searchParams.get("execution_mode");
  const executionMode: ExecutionMode = isExecutionMode(raw) ? raw : "live";

  return {
    executionMode,
    apiExecutionMode: executionMode === "all" ? undefined : executionMode,
  };
}

export default function ExecutionModeFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get("execution_mode");
  const currentMode: ExecutionMode = isExecutionMode(raw) ? raw : "live";

  const setMode = useCallback(
    (mode: ExecutionMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "live") {
        params.delete("execution_mode");
      } else {
        params.set("execution_mode", mode);
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex gap-1" role="group" aria-label="Execution mode filter">
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          aria-pressed={currentMode === key}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            currentMode === key
              ? "bg-zinc-700 text-zinc-100"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
