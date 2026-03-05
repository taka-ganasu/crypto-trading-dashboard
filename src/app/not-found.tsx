import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-xs uppercase tracking-wider text-zinc-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          お探しのページは存在しないか、移動された可能性がございます。
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          ダッシュボードに戻る
        </Link>
      </div>
    </div>
  );
}
