import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import type { SystemStatsResponse } from "@/types";
import StatsOverviewCards from "../StatsOverviewCards";

afterEach(cleanup);

const sampleStats: SystemStatsResponse = {
  recent_trades: 42,
  recent_signals: 15,
  recent_mdse_events: 7,
  api_version: "1.2.3",
  last_updated: "2026-03-01T12:00:00Z",
};

describe("StatsOverviewCards", () => {
  it("renders loading skeleton when loading=true", () => {
    render(<StatsOverviewCards stats={null} loading={true} error={null} />);
    const section = screen.getByTestId("stats-overview-cards");
    expect(section).toBeDefined();
    expect(screen.getByText("Activity Snapshot")).toBeDefined();
    // Loading state shows pulse skeletons, not stat values
    expect(screen.queryByTestId("stats-recent-trades")).toBeNull();
  });

  it("renders stat values with valid data", () => {
    render(<StatsOverviewCards stats={sampleStats} loading={false} error={null} />);
    expect(screen.getByTestId("stats-recent-trades").textContent).toBe("42");
    expect(screen.getByTestId("stats-recent-signals").textContent).toBe("15");
    expect(screen.getByTestId("stats-mdse-events").textContent).toBe("7");
  });

  it("shows API version", () => {
    render(<StatsOverviewCards stats={sampleStats} loading={false} error={null} />);
    expect(screen.getByTestId("stats-api-version").textContent).toBe("1.2.3");
  });

  it("shows formatted last updated timestamp", () => {
    render(<StatsOverviewCards stats={sampleStats} loading={false} error={null} />);
    const el = screen.getByTestId("stats-last-updated");
    // Should format as locale string, not raw ISO
    expect(el.textContent).not.toBe("2026-03-01T12:00:00Z");
    expect(el.textContent).not.toBe("—");
  });

  it("shows No data when stats is null", () => {
    render(<StatsOverviewCards stats={null} loading={false} error={null} />);
    expect(screen.getByTestId("stats-recent-trades").textContent).toBe("No data");
    expect(screen.getByTestId("stats-recent-signals").textContent).toBe("No data");
    expect(screen.getByTestId("stats-mdse-events").textContent).toBe("No data");
  });

  it("shows dash for missing api version and last updated", () => {
    render(<StatsOverviewCards stats={{}} loading={false} error={null} />);
    expect(screen.getByTestId("stats-api-version").textContent).toBe("—");
    expect(screen.getByTestId("stats-last-updated").textContent).toBe("—");
  });

  it("displays error message when error prop is set", () => {
    render(
      <StatsOverviewCards stats={null} loading={false} error="Failed to fetch stats" />
    );
    expect(screen.getByText("Failed to fetch stats")).toBeDefined();
  });

  it("reads nested db_stats paths as fallback", () => {
    const nestedStats: SystemStatsResponse = {
      db_stats: {
        total_trades: 100,
        total_signals: 50,
        total_distortion_events: 25,
      },
    };
    render(<StatsOverviewCards stats={nestedStats} loading={false} error={null} />);
    expect(screen.getByTestId("stats-recent-trades").textContent).toBe("100");
    expect(screen.getByTestId("stats-recent-signals").textContent).toBe("50");
    expect(screen.getByTestId("stats-mdse-events").textContent).toBe("25");
  });

  it("does not show error when error is null", () => {
    render(<StatsOverviewCards stats={sampleStats} loading={false} error={null} />);
    const section = screen.getByTestId("stats-overview-cards");
    expect(section.querySelector(".text-red-400")).toBeNull();
  });
});
