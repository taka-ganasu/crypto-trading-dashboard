"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Error</p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
          Something went wrong
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          {error.message || "An unexpected error occurred in the dashboard."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
