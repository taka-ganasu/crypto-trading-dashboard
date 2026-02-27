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
