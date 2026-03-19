/**
 * Extended AppShell navigation & routing tests.
 *
 * Covers: link href verification, all-route active-state cycling,
 * inactive link styling, mobile nav link-click close, nav accessibility,
 * and single-active-link invariant.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation with controllable pathname
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

import AppShell from "../AppShell";

/** All expected navigation items in order */
const expectedNavItems = [
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

afterEach(() => {
  cleanup();
  mockPathname.mockReturnValue("/");
});

/* ------------------------------------------------------------------ */
/* Navigation link href verification                                   */
/* ------------------------------------------------------------------ */

describe("AppShell — link href verification", () => {
  it("every navigation link points to the correct route", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");

    expect(links).toHaveLength(expectedNavItems.length);

    expectedNavItems.forEach((item, i) => {
      expect(links[i].getAttribute("href")).toBe(item.href);
      expect(links[i].textContent).toBe(item.label);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Active state for every route                                        */
/* ------------------------------------------------------------------ */

describe("AppShell — active state cycling (all routes)", () => {
  expectedNavItems.forEach(({ href, label }) => {
    it(`marks "${label}" (${href}) as active when pathname matches`, () => {
      mockPathname.mockReturnValue(href);
      render(
        <AppShell>
          <div />
        </AppShell>
      );

      const nav = screen.getByRole("navigation");
      const link = within(nav).getByText(label);

      expect(link.getAttribute("aria-current")).toBe("page");
      expect(link.className).toContain("bg-zinc-800");
      expect(link.className).toContain("text-zinc-100");
    });
  });
});

/* ------------------------------------------------------------------ */
/* Single active link invariant                                        */
/* ------------------------------------------------------------------ */

describe("AppShell — single active link invariant", () => {
  it("only one link has aria-current='page' at a time", () => {
    mockPathname.mockReturnValue("/portfolio");
    render(
      <AppShell>
        <div />
      </AppShell>
    );

    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");

    const activeLinks = links.filter(
      (l) => l.getAttribute("aria-current") === "page"
    );
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0].textContent).toBe("Portfolio");
  });

  it("non-active links have text-zinc-400 and no aria-current", () => {
    mockPathname.mockReturnValue("/signals");
    render(
      <AppShell>
        <div />
      </AppShell>
    );

    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");

    links.forEach((link) => {
      if (link.textContent === "Signals") return; // skip active
      expect(link.getAttribute("aria-current")).toBeNull();
      expect(link.className).toContain("text-zinc-400");
      expect(link.className).not.toContain("bg-zinc-800 text-zinc-100");
    });
  });
});

/* ------------------------------------------------------------------ */
/* Mobile navigation — link click closes menu                          */
/* ------------------------------------------------------------------ */

describe("AppShell — mobile nav closes on link click", () => {
  it("closes mobile nav when a nav link is clicked", () => {
    mockPathname.mockReturnValue("/");
    render(
      <AppShell>
        <div />
      </AppShell>
    );

    // Open mobile nav
    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    expect(screen.getByLabelText("Close navigation menu")).toBeDefined();

    // Click a nav link (e.g. Trades)
    const nav = screen.getByRole("navigation");
    fireEvent.click(within(nav).getByText("Trades"));

    // Overlay should be gone
    expect(screen.queryByLabelText("Close navigation menu")).toBeNull();
  });

  it("closes mobile nav when the active link is re-clicked", () => {
    mockPathname.mockReturnValue("/mdse");
    render(
      <AppShell>
        <div />
      </AppShell>
    );

    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    expect(screen.getByLabelText("Close navigation menu")).toBeDefined();

    const nav = screen.getByRole("navigation");
    fireEvent.click(within(nav).getByText("MDSE"));

    expect(screen.queryByLabelText("Close navigation menu")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Navigation accessibility                                            */
/* ------------------------------------------------------------------ */

describe("AppShell — navigation accessibility", () => {
  it("nav element has aria-label 'Main navigation'", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const nav = screen.getByRole("navigation");
    expect(nav.getAttribute("aria-label")).toBe("Main navigation");
  });

  it("sidebar shows app brand title and subtitle", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    expect(screen.getByText("Crypto Trading")).toBeDefined();
    // "Dashboard" appears as both subtitle and nav link
    const dashboardElements = screen.getAllByText("Dashboard");
    expect(dashboardElements.length).toBeGreaterThanOrEqual(2);
  });

  it("header shows page title", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    expect(screen.getByText("Crypto Trading Dashboard")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Pathname edge cases                                                 */
/* ------------------------------------------------------------------ */

describe("AppShell — pathname edge cases", () => {
  it("no link is active when pathname does not match any route", () => {
    mockPathname.mockReturnValue("/nonexistent");
    render(
      <AppShell>
        <div />
      </AppShell>
    );

    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");

    const activeLinks = links.filter(
      (l) => l.getAttribute("aria-current") === "page"
    );
    expect(activeLinks).toHaveLength(0);
  });

  it("root '/' is active only for exact match, not for sub-paths", () => {
    mockPathname.mockReturnValue("/trades");
    render(
      <AppShell>
        <div />
      </AppShell>
    );

    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");

    // Root link (first) should NOT be active
    expect(links[0].getAttribute("aria-current")).toBeNull();
    // Trades link should be active
    expect(links[1].getAttribute("aria-current")).toBe("page");
  });
});
