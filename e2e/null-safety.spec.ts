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
      "No detector data available",
      "No events found",
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
  { path: "/analysis", fallbackTexts: ["No analysis cycles found", "—"] },
  {
    path: "/strategies",
    fallbackTexts: ["No trades yet for this execution mode.", "0 strategies"],
  },
] as const;

const emptyStateTargets = [
  {
    path: "/",
    heading: "Dashboard",
    emptyTexts: ["No trades yet"],
  },
  {
    path: "/trades",
    heading: "Trade History",
    emptyTexts: ["No trades found"],
  },
  {
    path: "/signals",
    heading: "Signals",
    emptyTexts: ["No signals found"],
  },
  {
    path: "/portfolio",
    heading: "Portfolio",
    emptyTexts: ["No strategy data available"],
  },
  {
    path: "/circuit-breaker",
    heading: "Circuit Breaker",
    emptyTexts: ["No circuit breaker events recorded"],
  },
  {
    path: "/mdse",
    heading: "MDSE Detector Status",
    emptyTexts: [
      "No detector data available",
      "No events found",
      "No MDSE trades found",
      "No timeline data available",
    ],
  },
  {
    path: "/system",
    heading: "System",
    emptyTexts: [
      "Health monitor not running (API-only mode)",
      "No checks available from /api/health.",
    ],
  },
  {
    path: "/performance",
    heading: "Performance",
    emptyTexts: ["No execution data"],
  },
  {
    path: "/analysis",
    heading: "Analysis",
    emptyTexts: ["No analysis cycles found"],
  },
  {
    path: "/strategies",
    heading: "Strategies",
    emptyTexts: ["No trades yet for this execution mode."],
  },
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

for (const target of emptyStateTargets) {
  test(`empty-state: ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);

    await expect(
      page.getByRole("heading", { level: 1, name: target.heading })
    ).toBeVisible();

    for (const text of target.emptyTexts) {
      await expect(page.getByText(text).first()).toBeVisible();
    }

    if (target.path === "/") {
      await expect(page.getByTestId("stats-recent-trades")).toHaveText("No data");
      await expect(page.getByTestId("stats-recent-signals")).toHaveText("No data");
      await expect(page.getByTestId("stats-mdse-events")).toHaveText("No data");
    }

    if (target.path === "/system") {
      await page.getByTestId("system-tab-error-log").click();
      await expect(
        page.getByText("No API errors found for the selected range.")
      ).toBeVisible();
    }

    expectNoConsoleErrors(errors);
  });
}
