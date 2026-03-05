"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/trades", label: "Trades" },
  { href: "/signals", label: "Signals" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/performance", label: "Performance" },
  { href: "/analysis", label: "Analysis" },
  { href: "/strategies", label: "Strategies" },
  { href: "/circuit-breaker", label: "Circuit Breaker" },
  { href: "/mdse", label: "MDSE" },
  { href: "/system", label: "System" },
];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  function closeMobileNav(): void {
    setMobileNavOpen(false);
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-zinc-800 px-4 py-5">
          <h1 className="text-lg font-bold tracking-tight">Crypto Trading</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Dashboard</p>
        </div>
        <nav className="flex-1 px-2 py-3" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileNav}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-zinc-800 px-4 md:px-6">
          <button
            type="button"
            aria-label="Open navigation menu"
            className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <span className="sr-only">Open navigation menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h2 className="truncate text-sm font-medium text-zinc-300">
            Crypto Trading Dashboard
          </h2>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
