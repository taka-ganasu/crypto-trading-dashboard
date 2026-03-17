import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  Geist: vi.fn(() => ({ variable: "font-geist-sans" })),
  Geist_Mono: vi.fn(() => ({ variable: "font-geist-mono" })),
}));

vi.mock("@/components/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

import { Geist, Geist_Mono } from "next/font/google";
import RootLayout, { metadata, viewport } from "../layout";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("app/layout", () => {
  it("exports metadata and viewport", () => {
    expect(metadata.title).toBe("Crypto Trading Dashboard");
    expect(metadata.description).toContain("Real-time monitoring dashboard");
    expect(metadata.openGraph?.siteName).toBe("Crypto Trading Dashboard");
    expect(metadata.icons?.icon?.[0]).toEqual({
      url: "/icon.svg",
      type: "image/svg+xml",
    });
    expect(metadata.icons?.shortcut).toEqual(["/icon.svg"]);

    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
    expect(viewport.themeColor).toBe("#09090b");
  });

  it("wraps children in AppShell with font variables applied", () => {
    const tree = RootLayout({
      children: <div>Layout Child</div>,
    }) as React.ReactElement;

    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("en");

    const body = tree.props.children as React.ReactElement;
    expect(body.type).toBe("body");
    expect(body.props.className).toContain("font-geist-sans");
    expect(body.props.className).toContain("font-geist-mono");
    expect(body.props.className).toContain("antialiased");

    render(body.props.children);

    expect(screen.getByTestId("app-shell")).toBeDefined();
    expect(screen.getByText("Layout Child")).toBeDefined();
    expect(vi.mocked(Geist)).toHaveBeenCalledWith({
      variable: "--font-geist-sans",
      subsets: ["latin"],
    });
    expect(vi.mocked(Geist_Mono)).toHaveBeenCalledWith({
      variable: "--font-geist-mono",
      subsets: ["latin"],
    });
  });
});
