import type { ReactNode } from "react";

export interface DetailRowProps {
  label: string;
  value: ReactNode;
}

export default function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-800/70 pb-2">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-mono text-zinc-200">{value}</span>
    </div>
  );
}
