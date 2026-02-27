"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 max-w-md text-center">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => reset()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
