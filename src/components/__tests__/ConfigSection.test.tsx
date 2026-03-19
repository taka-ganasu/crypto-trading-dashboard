import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ConfigSection from "../system/ConfigSection";

afterEach(() => {
  cleanup();
});

describe("ConfigSection", () => {
  it("shows loading skeleton", () => {
    render(
      <ConfigSection
        loading={true}
        botVersionFromHealth={null}
        vpsHead={null}
        mainHead={null}
        isHeadDrift={false}
        info={null}
        dashboardVersion="1.0.0"
      />
    );
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(1);
  });

  it("renders version info when loaded", () => {
    render(
      <ConfigSection
        loading={false}
        botVersionFromHealth="0.42.0"
        vpsHead="abc1234"
        mainHead="abc1234"
        isHeadDrift={false}
        info={{
          api_version: "2.1.0",
          bot_version: "0.42.0",
          db_path: "/data/trades.db",
          python_version: "3.12.4",
          platform: "Linux",
        }}
        dashboardVersion="1.5.0"
      />
    );
    expect(screen.getByTestId("vps-bot-version-value").textContent).toBe("0.42.0");
    expect(screen.getByTestId("vps-head-value").textContent).toBe("abc1234");
    expect(screen.getByTestId("main-head-value").textContent).toBe("abc1234");
    expect(screen.getByTestId("head-sync-status").textContent).toBe("IN_SYNC");
    expect(screen.getByTestId("api-version-value").textContent).toBe("2.1.0");
    expect(screen.getByTestId("dashboard-version-value").textContent).toBe("1.5.0");
  });

  it("shows DRIFT when heads differ", () => {
    render(
      <ConfigSection
        loading={false}
        botVersionFromHealth="0.42.0"
        vpsHead="abc1234"
        mainHead="def5678"
        isHeadDrift={true}
        info={null}
        dashboardVersion="1.0.0"
      />
    );
    expect(screen.getByTestId("head-sync-status").textContent).toBe("DRIFT");
    expect(screen.getByText("Warning: VPS HEAD differs from main HEAD.")).toBeTruthy();
  });

  it("shows UNKNOWN when heads are null", () => {
    render(
      <ConfigSection
        loading={false}
        botVersionFromHealth={null}
        vpsHead={null}
        mainHead={null}
        isHeadDrift={false}
        info={null}
        dashboardVersion="1.0.0"
      />
    );
    expect(screen.getByTestId("head-sync-status").textContent).toBe("UNKNOWN");
  });

  it("shows dashes for null info fields", () => {
    render(
      <ConfigSection
        loading={false}
        botVersionFromHealth={null}
        vpsHead={null}
        mainHead={null}
        isHeadDrift={false}
        info={null}
        dashboardVersion="1.0.0"
      />
    );
    const dashes = screen.getAllByText("—");
    // botVersion, vpsHead, mainHead, apiVersion, botVersion, dbPath, pythonVersion
    expect(dashes.length).toBeGreaterThanOrEqual(5);
  });
});
