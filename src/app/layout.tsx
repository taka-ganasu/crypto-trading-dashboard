import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crypto Trading Dashboard",
  description: "Real-time crypto trading monitoring dashboard",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/trades", label: "Trades" },
  { href: "/signals", label: "Signals" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/performance", label: "Performance" },
  { href: "/circuit-breaker", label: "Circuit Breaker" },
  { href: "/mdse", label: "MDSE" },
  { href: "/system", label: "System" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen bg-zinc-950 text-zinc-100">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
            <div className="px-4 py-5 border-b border-zinc-800">
              <h1 className="text-lg font-bold tracking-tight">
                Crypto Trading
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">Dashboard</p>
            </div>
            <nav className="flex-1 px-2 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-14 shrink-0 border-b border-zinc-800 flex items-center px-6">
              <h2 className="text-sm font-medium text-zinc-300">
                Crypto Trading Dashboard
              </h2>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto p-6">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
