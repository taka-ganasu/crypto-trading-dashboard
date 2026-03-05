import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  nullSafeApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("MDSE Timeline Chart", () => {
  test("renders timeline chart with data", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/mdse");
    const chart = page.getByTestId("mdse-timeline-chart");
    await expect(chart).toBeVisible();

    // Chart should contain SVG (Recharts renders SVG)
    await expect(chart.locator("svg").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders legend with detector names", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/mdse");
    const legend = page.getByTestId("mdse-timeline-legend");
    await expect(legend).toBeVisible();

    // Should show both detectors from mock data
    await expect(legend.getByText("fr_extreme")).toBeVisible();
    await expect(legend.getByText("liq_cascade")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("shows Detector Timeline heading", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/mdse");
    await expect(
      page.getByRole("heading", { name: "Detector Timeline" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("shows empty state when no timeline data", async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/mdse");
    const chart = page.getByTestId("mdse-timeline-chart");
    await expect(chart).toBeVisible();
    await expect(chart.getByText("No timeline data available")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("no crash when timeline API fails", async ({ page }) => {
    // Override timeline to return error
    const responses = { ...defaultApiResponses };
    delete responses["/api/mdse/timeline"];

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/mdse/timeline") {
        await route.fulfill({ status: 500, body: "Internal Server Error" });
        return;
      }
      const payload = pathname in responses ? responses[pathname] : {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    const errors = trackConsoleErrors(page);
    await page.goto("/mdse");

    // Page should still render (timeline gracefully handles error)
    await expect(
      page.getByRole("heading", { level: 1, name: "MDSE Detector Status" })
    ).toBeVisible();

    // Filter errors from the expected API failure
    const nonApiErrors = errors.filter(
      (e) => !e.includes("500") && !e.includes("API error")
    );
    expect(
      nonApiErrors,
      `Unexpected errors:\n${nonApiErrors.join("\n")}`
    ).toEqual([]);
  });
});
