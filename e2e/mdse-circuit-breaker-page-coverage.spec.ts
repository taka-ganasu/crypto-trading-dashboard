import { expect, test, type Route } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  trackConsoleErrors,
} from "./test-utils";

type ApiPayloadMap = Record<string, unknown>;

type RouteDecision = {
  status?: number;
  body: unknown;
};

type RouteResolver = (
  url: URL
) => RouteDecision | null | Promise<RouteDecision | null>;

const apiResponses = defaultApiResponses as ApiPayloadMap;

async function fulfillApiRoute(
  route: Route,
  resolver?: RouteResolver
): Promise<void> {
  const parsed = new URL(route.request().url());
  const resolved = resolver ? await resolver(parsed) : null;
  if (resolved != null) {
    await route.fulfill({
      status: resolved.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(resolved.body),
    });
    return;
  }

  const payload = parsed.pathname in apiResponses ? apiResponses[parsed.pathname] : {};
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

test.describe("MDSE page coverage", () => {
  test("shows a critical error state and recovers after Retry", async ({ page }) => {
    const attemptCounts = new Map<string, number>();
    const failingPaths = new Set([
      "/api/mdse/summary",
      "/api/mdse/events",
      "/api/mdse/trades",
    ]);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (!failingPaths.has(url.pathname)) return null;

        const attempts = (attemptCounts.get(url.pathname) ?? 0) + 1;
        attemptCounts.set(url.pathname, attempts);

        if (attempts === 1) {
          return {
            status: 500,
            body: { error: `${url.pathname} unavailable` },
          };
        }

        return null;
      });
    });

    await page.goto("/mdse");

    await expect(page.getByText("Error: Failed to load MDSE data.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "MDSE Detector Status" })
    ).toBeVisible();
    await expect(page.getByText("detector-a").first()).toBeVisible();
    await expect(page.getByRole("table", { name: "MDSE trades table" })).toContainText(
      "BTC/USDT"
    );

    expect(attemptCounts.get("/api/mdse/summary")).toBe(2);
    expect(attemptCounts.get("/api/mdse/events")).toBe(2);
    expect(attemptCounts.get("/api/mdse/trades")).toBe(2);
  });

  test("keeps healthy sections visible when detector summary fails", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/mdse/summary") return null;
        return {
          status: 500,
          body: { error: "summary unavailable" },
        };
      });
    });

    await page.goto("/mdse");

    await expect(page.getByRole("status")).toContainText("Some sections failed to load");
    await expect(page.getByRole("status")).toContainText("detector summary");
    await expect(page.getByText("No detector data available")).toBeVisible();
    await expect(page.getByText("1 events")).toBeVisible();
    await expect(page.getByRole("table", { name: "MDSE trades table" })).toContainText(
      "BTC/USDT"
    );
  });
});

test.describe("Circuit Breaker page coverage", () => {
  test("normalizes lowercase warning status and falls back null event fields", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/cb/state") return null;
        return {
          body: {
            data: {
              status: "warning",
              recent_events: [
                {
                  status: "warning",
                  message: null,
                  timestamp: null,
                },
              ],
            },
          },
        };
      });
    });

    await page.goto("/circuit-breaker");

    await expect(page.getByText("WARNING").first()).toBeVisible();
    await expect(
      page.getByText("Consecutive loss threshold reached. Leverage reduced automatically.")
    ).toBeVisible();
    await expect(page.getByText("State change")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("defaults unknown current status to NORMAL while keeping empty-state messaging", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/cb/state") return null;
        return {
          body: {
            data: {
              status: "mystery_mode",
              recent_events: [],
            },
          },
        };
      });
    });

    await page.goto("/circuit-breaker");

    await expect(page.getByText("NORMAL").first()).toBeVisible();
    await expect(
      page.getByText("All systems operational. Trading is active.")
    ).toBeVisible();
    await expect(page.getByText("No circuit breaker events recorded")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
