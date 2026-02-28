"use client";

import { useEffect, type ReactNode } from "react";

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function DetailPanel({
  isOpen,
  onClose,
  title,
  children,
}: DetailPanelProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close details panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 h-full w-full max-w-xl border-l border-zinc-800 bg-zinc-900 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div className="h-[calc(100%-65px)] overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}
