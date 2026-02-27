import { expect, test } from "@playwright/test";
import {
  expectNoConsoleErrors,
  installApiMocks,
  nullSafeApiResponses,
  trackConsoleErrors,
} from "./test-utils";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const nullSafetyTargets = [
  { path: "/", fallbackTexts: ["No trades yet"] },
  { path: "/trades", fallbackTexts: ["No trades found"] },
  { path: "/signals", fallbackTexts: ["No signals found"] },
  { path: "/portfolio", fallbackTexts: ["No strategy data available", "N/A"] },
  {
    path: "/circuit-breaker",
    fallbackTexts: ["No circuit breaker events recorded"],
  },
  {
    path: "/mdse",
    fallbackTexts: [
      "No detector scores available",
      "No events in the last 24 hours",
      "No MDSE trades found",
    ],
  },
  {
    path: "/system",
    fallbackTexts: [
      "Health monitor not running (API-only mode)",
      "Disconnected",
      "—",
    ],
  },
  { path: "/performance", fallbackTexts: ["No execution data", "—"] },
] as const;

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, nullSafeApiResponses);
});

for (const target of nullSafetyTargets) {
  test(`null-safety: ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const fallbackPattern = new RegExp(
      target.fallbackTexts.map(escapeRegExp).join("|"),
      "i"
    );

    await page.goto(target.path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(fallbackPattern).first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });
}
