import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Strategies page remaining coverage", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("toggles sort indicator states for comparison table", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");

    const winRateHeader = page
      .getByRole("columnheader", { name: /Win Rate/ })
      .first();
    await expect(winRateHeader).toContainText("SORT");

    await page
      .getByRole("columnheader", { name: /Win Rate/ })
      .getByRole("button", { name: "Win Rate" })
      .click();
    await expect(winRateHeader).toContainText("DESC");

    await page
      .getByRole("columnheader", { name: /Win Rate/ })
      .getByRole("button", { name: "Win Rate" })
      .click();
    await expect(winRateHeader).toContainText("ASC");

    expectNoConsoleErrors(errors);
  });

  test("supports Escape key and backdrop close on strategy details", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");

    await page.getByRole("button", { name: /trend_following/ }).click();
    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: /trend_following/ }).click();
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Close details panel" }).click();
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });

  test("execution mode filter swaps strategy lists and shows empty state for unavailable modes", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const pageMode =
        new URL(page.url() === "about:blank" ? "http://localhost/strategies" : page.url())
          .searchParams.get("execution_mode") ?? "live";
      const mode = url.searchParams.get("execution_mode") ?? pageMode;

      if (url.pathname === "/api/performance/by-strategy") {
        const payload =
          mode === "paper"
            ? []
            : mode === "all"
              ? [
                  {
                    strategy: "trend_following",
                    trade_count: 15,
                    win_rate: 0.6,
                    profit_factor: 1.8,
                    sharpe: 1.2,
                    avg_pnl: 25.5,
                    max_dd: 120,
                  },
                  {
                    strategy: "mean_reversion",
                    trade_count: 10,
                    win_rate: 0.5,
                    profit_factor: 1.1,
                    sharpe: 0.6,
                    avg_pnl: 5.2,
                    max_dd: 80,
                  },
                  {
                    strategy: "paper_scalper",
                    trade_count: 4,
                    win_rate: 0.75,
                    profit_factor: 1.4,
                    sharpe: 0.9,
                    avg_pnl: 18.25,
                    max_dd: 40,
                  },
                ]
              : [
                  {
                    strategy: "trend_following",
                    trade_count: 15,
                    win_rate: 0.6,
                    profit_factor: 1.8,
                    sharpe: 1.2,
                    avg_pnl: 25.5,
                    max_dd: 120,
                  },
                  {
                    strategy: "mean_reversion",
                    trade_count: 10,
                    win_rate: 0.5,
                    profit_factor: 1.1,
                    sharpe: 0.6,
                    avg_pnl: 5.2,
                    max_dd: 80,
                  },
                ];

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });
        return;
      }

      const payload =
        url.pathname in defaultApiResponses
          ? defaultApiResponses[url.pathname as keyof typeof defaultApiResponses]
          : {};

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto("/strategies");

    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });

    await expect(page.getByText("2 strategies")).toBeVisible();
    await expect(page.getByRole("button", { name: /trend_following/ })).toBeVisible();

    await filterGroup.getByRole("button", { name: "Paper" }).click();
    await expect(page).toHaveURL(/execution_mode=paper/);
    await expect(page.getByText("0 strategies")).toBeVisible();
    await expect(page.getByText("No trades yet for this execution mode.")).toBeVisible();

    await filterGroup.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/execution_mode=all/);
    await expect(page.getByText("3 strategies")).toBeVisible();
    await expect(page.getByRole("button", { name: /paper_scalper/ })).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
