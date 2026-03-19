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
    const icons = metadata.icons as { icon?: Array<{ url: string; type: string }>; shortcut?: string[] } | undefined;
    expect(icons?.icon?.[0]).toEqual({
      url: "/icon.svg",
      type: "image/svg+xml",
    });
    expect(icons?.shortcut).toEqual(["/icon.svg"]);

    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);
    expect(viewport.themeColor).toBe("#09090b");
  });

  it("wraps children in AppShell with font variables applied", () => {
    const tree = RootLayout({
      children: <div>Layout Child</div>,
    }) as React.ReactElement;

    const treeProps = tree.props as Record<string, unknown>;
    expect(tree.type).toBe("html");
    expect(treeProps.lang).toBe("en");

    const body = treeProps.children as React.ReactElement;
    const bodyProps = body.props as Record<string, unknown>;
    expect(body.type).toBe("body");
    expect(bodyProps.className).toContain("font-geist-sans");
    expect(bodyProps.className).toContain("font-geist-mono");
    expect(bodyProps.className).toContain("antialiased");

    render(bodyProps.children as React.ReactElement);

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
