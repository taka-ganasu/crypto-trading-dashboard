import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("MDSE detail page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders detector status, timeline, and events", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/mdse");

    await expect(
      page.getByRole("heading", { level: 1, name: "MDSE Detector Status" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Detector Timeline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Events" })).toBeVisible();

    await expect(page.getByText("detector-a").first()).toBeVisible();
    await expect(page.getByText("61.0%")).toBeVisible();

    const timelineChart = page.getByTestId("mdse-timeline-chart");
    await expect(timelineChart).toBeVisible();
    await expect(page.getByTestId("mdse-timeline-legend").getByText("fr_extreme")).toBeVisible();
    await expect(page.getByTestId("mdse-timeline-legend").getByText("liq_cascade")).toBeVisible();

    await expect(page.getByText("1 events")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders MDSE trades table headers and row data", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/mdse");

    const table = page.getByRole("table", { name: "MDSE trades table" });
    await expect(table).toBeVisible();

    await expect(table.getByRole("columnheader", { name: "Event ID" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Symbol" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Direction" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Entry Price" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Exit Price" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "PnL" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Size" })).toBeVisible();

    await expect(table.getByRole("cell", { name: "#1" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "LONG" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
