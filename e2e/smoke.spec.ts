import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const smokeTargets = [
  { path: "/", heading: "Dashboard" },
  { path: "/trades", heading: "Trade History" },
  { path: "/signals", heading: "Signals" },
  { path: "/portfolio", contentText: "Strategy Allocations" },
  { path: "/circuit-breaker", heading: "Circuit Breaker" },
  { path: "/mdse", heading: "MDSE Detector Status" },
  { path: "/system", heading: "System" },
  { path: "/performance", heading: "Performance" },
  { path: "/analysis", heading: "Analysis" },
  { path: "/strategies", heading: "Strategies" },
] as const;

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

for (const target of smokeTargets) {
  test(`smoke: ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    await expect(page.locator("main")).toBeVisible();

    if ("heading" in target) {
      await expect(
        page.getByRole("heading", { level: 1, name: target.heading })
      ).toBeVisible();
    } else {
      await expect(page.getByText(target.contentText)).toBeVisible();
    }

    expectNoConsoleErrors(errors);
  });
}

test("smoke: /system go-live widget", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto("/system");
  await expect(page.getByTestId("go-live-widget")).toBeVisible();
  await expect(page.getByText("75% (9/12)")).toBeVisible();
  await expect(page.getByTestId("go-live-item")).toHaveCount(12);

  expectNoConsoleErrors(errors);
});
