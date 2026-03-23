import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ConfigSection from "../system/ConfigSection";
import type { SystemInfo } from "@/types";

afterEach(cleanup);

function renderConfig(overrides: Partial<Parameters<typeof ConfigSection>[0]> = {}) {
  const defaults = {
    loading: false,
    botVersionFromHealth: null,
    vpsHead: null,
    mainHead: null,
    isHeadDrift: false,
    info: null,
    dashboardVersion: "1.0.0",
  };
  return render(<ConfigSection {...defaults} {...overrides} />);
}

describe("ConfigSection — sync status edge cases", () => {
  it("shows UNKNOWN when only vpsHead is provided (mainHead null)", () => {
    renderConfig({ vpsHead: "abc1234", mainHead: null });
    expect(screen.getByTestId("head-sync-status").textContent).toBe("UNKNOWN");
  });

  it("shows UNKNOWN when only mainHead is provided (vpsHead null)", () => {
    renderConfig({ vpsHead: null, mainHead: "abc1234" });
    expect(screen.getByTestId("head-sync-status").textContent).toBe("UNKNOWN");
  });

  it("shows IN_SYNC with matching heads and no drift warning", () => {
    renderConfig({ vpsHead: "same123", mainHead: "same123", isHeadDrift: false });
    expect(screen.getByTestId("head-sync-status").textContent).toBe("IN_SYNC");
    expect(screen.getByTestId("head-sync-status").className).toContain("text-emerald-300");
    expect(screen.queryByText("Warning: VPS HEAD differs from main HEAD.")).toBeNull();
  });

  it("shows DRIFT with yellow styling and warning message", () => {
    renderConfig({ vpsHead: "abc1234", mainHead: "def5678", isHeadDrift: true });
    expect(screen.getByTestId("head-sync-status").textContent).toBe("DRIFT");
    expect(screen.getByTestId("head-sync-status").className).toContain("text-yellow-300");
    expect(screen.getByText("Warning: VPS HEAD differs from main HEAD.")).toBeDefined();
  });
});

describe("ConfigSection — partial info fields", () => {
  it("renders partial info with only api_version set", () => {
    const info: SystemInfo = {
      api_version: "3.0.0",
    } as SystemInfo;
    renderConfig({ info });
    expect(screen.getByTestId("api-version-value").textContent).toBe("3.0.0");
    expect(screen.getByTestId("bot-version-value").textContent).toBe("—");
  });

  it("renders all info fields when fully populated", () => {
    const info: SystemInfo = {
      api_version: "2.1.0",
      bot_version: "0.42.0",
      db_path: "/data/trades.db",
      python_version: "3.12.4",
      platform: "linux",
    };
    renderConfig({
      info,
      botVersionFromHealth: "0.42.0",
      vpsHead: "abc1234",
      mainHead: "abc1234",
      dashboardVersion: "2.0.0",
    });
    expect(screen.getByTestId("api-version-value").textContent).toBe("2.1.0");
    expect(screen.getByTestId("bot-version-value").textContent).toBe("0.42.0");
    expect(screen.getByTestId("dashboard-version-value").textContent).toBe("2.0.0");
    expect(screen.getByTestId("vps-bot-version-value").textContent).toBe("0.42.0");
  });
});

describe("ConfigSection — loading state", () => {
  it("shows multiple skeleton items when loading", () => {
    const { container } = renderConfig({ loading: true });
    const pulses = container.querySelectorAll(".animate-pulse");
    // 4 for VPS version + 3 for API info = 7
    expect(pulses.length).toBe(7);
  });

  it("does not show skeleton when not loading", () => {
    const { container } = renderConfig({ loading: false });
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBe(0);
  });
});

describe("ConfigSection — heading elements", () => {
  it("renders both section headings", () => {
    renderConfig();
    expect(screen.getByTestId("vps-version-heading").textContent).toBe("VPS Version");
    expect(screen.getByTestId("api-info-heading").textContent).toBe("API Information");
  });
});

describe("ConfigSection — botVersionFromHealth display", () => {
  it("shows version string when provided", () => {
    renderConfig({ botVersionFromHealth: "1.2.3" });
    expect(screen.getByTestId("vps-bot-version-value").textContent).toBe("1.2.3");
  });

  it("shows dash when botVersionFromHealth is null", () => {
    renderConfig({ botVersionFromHealth: null });
    expect(screen.getByTestId("vps-bot-version-value").textContent).toBe("—");
  });
});
