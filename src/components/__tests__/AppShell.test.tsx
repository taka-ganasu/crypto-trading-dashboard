import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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

// Mock next/navigation
const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

import AppShell from "../AppShell";

afterEach(() => {
  cleanup();
  mockPathname.mockReturnValue("/");
});

describe("AppShell", () => {
  it("renders children content", () => {
    render(
      <AppShell>
        <div>Page Content</div>
      </AppShell>
    );
    expect(screen.getByText("Page Content")).toBeDefined();
  });

  it("renders all navigation items", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const nav = screen.getByRole("navigation");
    expect(nav).toBeDefined();
    // "Dashboard" appears both in subtitle and nav link
    const dashboardLinks = screen.getAllByText("Dashboard");
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Trades")).toBeDefined();
    expect(screen.getByText("Signals")).toBeDefined();
    expect(screen.getByText("Portfolio")).toBeDefined();
    expect(screen.getByText("Performance")).toBeDefined();
    expect(screen.getByText("Analysis")).toBeDefined();
    expect(screen.getByText("Strategies")).toBeDefined();
    expect(screen.getByText("Circuit Breaker")).toBeDefined();
    expect(screen.getByText("MDSE")).toBeDefined();
    expect(screen.getByText("System")).toBeDefined();
  });

  it("marks current page link as active with aria-current", () => {
    mockPathname.mockReturnValue("/trades");
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const tradesLink = screen.getByText("Trades");
    expect(tradesLink.getAttribute("aria-current")).toBe("page");
  });

  it("non-active links do not have aria-current", () => {
    mockPathname.mockReturnValue("/");
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const tradesLink = screen.getByText("Trades");
    expect(tradesLink.getAttribute("aria-current")).toBeNull();
  });

  it("renders app title", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    expect(screen.getByText("Crypto Trading")).toBeDefined();
  });

  it("has mobile menu button", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const menuBtn = screen.getByLabelText("Open navigation menu");
    expect(menuBtn).toBeDefined();
  });

  it("opens mobile nav on hamburger click", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const menuBtn = screen.getByLabelText("Open navigation menu");
    fireEvent.click(menuBtn);
    // When open, overlay button appears
    expect(screen.getByLabelText("Close navigation menu")).toBeDefined();
  });

  it("closes mobile nav on overlay click", () => {
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    expect(screen.getByLabelText("Close navigation menu")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Close navigation menu"));
    expect(screen.queryByLabelText("Close navigation menu")).toBeNull();
  });

  it("active link has bg-zinc-800 class", () => {
    mockPathname.mockReturnValue("/mdse");
    render(
      <AppShell>
        <div />
      </AppShell>
    );
    const mdseLink = screen.getByText("MDSE");
    expect(mdseLink.className).toContain("bg-zinc-800");
  });
});
