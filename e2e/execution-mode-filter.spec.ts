import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const pagesWithFilter = [
  { path: "/trades", endpoint: "/api/trades" },
  { path: "/signals", endpoint: "/api/signals" },
  { path: "/performance", endpoint: "/api/performance/summary" },
];

const performanceRequestGroups = [
  { label: "summary", paths: ["/api/performance/summary"] },
  { label: "execution quality", paths: ["/api/performance/execution-quality"] },
  { label: "market snapshots", paths: ["/api/performance/market-snapshots"] },
  {
    label: "equity curve",
    paths: ["/api/equity-curve", "/api/performance/equity-curve"],
  },
  { label: "trades by strategy", paths: ["/api/trades/by-strategy"] },
];

function getCallsForPaths(apiCalls: string[], paths: string[]): URL[] {
  return apiCalls
    .map((url) => new URL(url))
    .filter((url) => paths.includes(url.pathname));
}

async function expectPerformanceRequestMode(
  apiCalls: string[],
  expectedMode: string | null
): Promise<void> {
  await expect
    .poll(() =>
      performanceRequestGroups.map(({ label, paths }) => {
        const matchingCalls = getCallsForPaths(apiCalls, paths);
        if (matchingCalls.length === 0) return `${label}:missing`;
        const matchesExpectedMode = matchingCalls.every((url) =>
          expectedMode === null
            ? !url.searchParams.has("execution_mode")
            : url.searchParams.get("execution_mode") === expectedMode
        );
        return matchesExpectedMode ? `${label}:ok` : `${label}:mismatch`;
      })
    )
    .toEqual(performanceRequestGroups.map(({ label }) => `${label}:ok`));
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

for (const target of pagesWithFilter) {
  test(`execution mode filter renders on ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });
    await expect(filterGroup).toBeVisible();

    await expect(
      filterGroup.getByRole("button", { name: "All" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });

  test(`execution mode filter updates URL on ${target.path}`, async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });

    await filterGroup.getByRole("button", { name: "Live" }).click();
    await expect(page).toHaveURL(new RegExp("execution_mode=live"));
    await expect(
      filterGroup.getByRole("button", { name: "Live" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "Dry-run" }).click();
    await expect(page).toHaveURL(new RegExp("execution_mode=dry_run"));
    await expect(
      filterGroup.getByRole("button", { name: "Dry-run" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "All" }).click();
    await expect(page).not.toHaveURL(new RegExp("execution_mode="));
    await expect(
      filterGroup.getByRole("button", { name: "All" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });
}

for (const target of pagesWithFilter) {
  test(`execution mode sends query param to API on ${target.path}`, async ({
    page,
  }) => {
    const apiCalls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      apiCalls.push(url);
      const { pathname } = new URL(url);
      const payload =
        pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto(`${target.path}?execution_mode=paper`);
    await page.waitForTimeout(500);

    const targetCalls = apiCalls.filter((url) => url.includes(target.endpoint));
    expect(targetCalls.length).toBeGreaterThan(0);
    expect(targetCalls.some((url) => url.includes("execution_mode=paper"))).toBeTruthy();
  });
}

test("performance filter propagates execution_mode to all dependent APIs and clears it for All", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/performance");
  await expect(
    page.getByRole("heading", { level: 1, name: "Performance" })
  ).toBeVisible();
  await expectPerformanceRequestMode(apiCalls, null);

  apiCalls.length = 0;
  await page.getByRole("button", { name: "Paper" }).click();
  await expect(page).toHaveURL(/execution_mode=paper/);
  await expectPerformanceRequestMode(apiCalls, "paper");

  apiCalls.length = 0;
  await page.getByRole("button", { name: "All" }).click();
  await expect(page).not.toHaveURL(/execution_mode=/);
  await expectPerformanceRequestMode(apiCalls, null);

  expectNoConsoleErrors(errors);
});
