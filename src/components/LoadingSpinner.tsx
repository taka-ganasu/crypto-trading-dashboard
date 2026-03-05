interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({
  label = "Loading content...",
}: LoadingSpinnerProps) {
  return (
    <div
      className="flex h-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="space-y-3 animate-pulse">
          <div className="h-3 w-2/3 rounded bg-zinc-800" />
          <div className="h-3 w-full rounded bg-zinc-800" />
          <div className="h-3 w-5/6 rounded bg-zinc-800" />
        </div>
        <p className="mt-3 text-sm text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
