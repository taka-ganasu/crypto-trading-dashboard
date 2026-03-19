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

test.describe("Wave11 Analysis E2E", () => {
  test("analysis shows time-range controls with 7d selected by default", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.route("**/api/**", async (route) => fulfillApiRoute(route));

    await page.goto("/analysis");
    const filter = page.getByRole("group", { name: "Time range filter" });
    await expect(filter).toBeVisible();
    await expect(filter.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.getByTestId("regime-timeline")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("analysis range filter updates URL and /api/cycles query parameters", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const cyclesCalls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const requestUrl = route.request().url();
      const parsed = new URL(requestUrl);
      if (parsed.pathname === "/api/cycles") {
        cyclesCalls.push(requestUrl);
      }
      await fulfillApiRoute(route);
    });

    await page.goto("/analysis");
    await page.getByRole("button", { name: "24h" }).click();
    await expect(page).toHaveURL(/range=24h/);

    await expect
      .poll(() => cyclesCalls[cyclesCalls.length - 1] ?? "")
      .toContain("start=");
    await expect
      .poll(() => cyclesCalls[cyclesCalls.length - 1] ?? "")
      .toContain("end=");

    await page.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/range=all/);

    await expect
      .poll(() => {
        const last = cyclesCalls[cyclesCalls.length - 1] ?? "";
        return !last.includes("start=") && !last.includes("end=");
      })
      .toBe(true);

    expectNoConsoleErrors(errors);
  });

  test("analysis renders empty-state timeline and table for zero cycles", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname === "/api/cycles") {
          return { body: [] };
        }
        return null;
      });
    });

    await page.goto("/analysis");

    await expect(page.getByText("0 cycles").first()).toBeVisible();
    await expect(page.getByTestId("regime-timeline")).toContainText(
      "No analysis cycles found"
    );
    await expect(page.getByRole("table", { name: "Cycle table" })).toContainText(
      "No analysis cycles found"
    );

    expectNoConsoleErrors(errors);
  });

  test("analysis normalizes unknown regime values to Unknown label", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/cycles") return null;
        return {
          body: [
            {
              id: 9001,
              start_time: "2026-01-01T00:00:00Z",
              end_time: "2026-01-01T00:05:00Z",
              symbols_processed: "[\"BTC/USDT\"]",
              signals_generated: 2,
              trades_executed: 1,
              errors: null,
              duration_seconds: 300,
              regime_info: "alien_market",
              created_at: "2026-01-01T00:05:00Z",
            },
          ],
        };
      });
    });

    await page.goto("/analysis");
    await expect(page.getByLabel("cycle-9001-unknown")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Unknown" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Wave11 Circuit Breaker E2E", () => {
  test("shows loading spinner while circuit breaker API response is pending", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    let release: () => void = () => {};
    const waitForRelease = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, async (url) => {
        if (url.pathname !== "/api/cb/state") return null;
        await waitForRelease;
        return { body: apiResponses["/api/cb/state"] ?? {} };
      });
    });

    await page.goto("/circuit-breaker");
    await expect(page.getByText("Loading circuit breaker data...")).toBeVisible();

    release();
    await expect(
      page.getByRole("heading", { level: 1, name: "Circuit Breaker" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders error state block when circuit breaker API fails", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname === "/api/cb/state") {
          return { status: 500, body: { error: "cb unavailable" } };
        }
        return null;
      });
    });

    await page.goto("/circuit-breaker");
    await expect(
      page.getByRole("heading", { level: 1, name: "Circuit Breaker" })
    ).toBeVisible();
    await expect(page.getByText("Failed to load circuit breaker state")).toBeVisible();
    await expect(page.getByText(/API error: 500/)).toBeVisible();
  });

  test("renders multiple recent events with mixed status badges", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/cb/state") return null;
        return {
          body: {
            data: {
              status: "PAUSED",
              recent_events: [
                {
                  status: "WARNING",
                  message: "Loss streak detected",
                  timestamp: "2026-01-01T12:00:00Z",
                },
                {
                  status: "STOPPED",
                  message: "Critical drawdown reached",
                  timestamp: "2026-01-01T13:00:00Z",
                },
              ],
            },
          },
        };
      });
    });

    await page.goto("/circuit-breaker");
    await expect(page.getByText("Loss streak detected")).toBeVisible();
    await expect(page.getByText("Critical drawdown reached")).toBeVisible();
    await expect(page.getByText("WARNING").first()).toBeVisible();
    await expect(page.getByText("STOPPED").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Wave11 MDSE E2E", () => {
  test("mdse range filter updates URL and requests start/end query params", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const trackedCalls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const requestUrl = route.request().url();
      const parsed = new URL(requestUrl);
      if (
        parsed.pathname === "/api/mdse/events" ||
        parsed.pathname === "/api/mdse/trades" ||
        parsed.pathname === "/api/mdse/timeline"
      ) {
        trackedCalls.push(requestUrl);
      }
      await fulfillApiRoute(route);
    });

    await page.goto("/mdse");
    await page.getByRole("button", { name: "30d" }).click();
    await expect(page).toHaveURL(/range=30d/);

    const lastEventsCall = trackedCalls
      .filter((call) => call.includes("/api/mdse/events"))
      .at(-1);
    const lastTradesCall = trackedCalls
      .filter((call) => call.includes("/api/mdse/trades"))
      .at(-1);
    const lastTimelineCall = trackedCalls
      .filter((call) => call.includes("/api/mdse/timeline"))
      .at(-1);

    expect(lastEventsCall).toContain("start=");
    expect(lastEventsCall).toContain("end=");
    expect(lastTradesCall).toContain("start=");
    expect(lastTradesCall).toContain("end=");
    expect(lastTimelineCall).toContain("start=");
    expect(lastTimelineCall).toContain("end=");

    expectNoConsoleErrors(errors);
  });

  test("opens MDSE trade details panel from row and closes with Escape", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.route("**/api/**", async (route) => fulfillApiRoute(route));

    await page.goto("/mdse");
    await page.getByRole("row", { name: /#1/ }).click();

    const dialog = page.getByRole("dialog", { name: "MDSE Trade Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Detector Name")).toBeVisible();
    await expect(dialog.getByText("Event ID")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });

  test("shows warning banner when only timeline endpoint fails", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname === "/api/mdse/timeline") {
          return { status: 500, body: { error: "timeline unavailable" } };
        }
        return null;
      });
    });

    await page.goto("/mdse");
    await expect(page.getByRole("status")).toContainText(
      "Some sections failed to load"
    );
    await expect(page.getByRole("status")).toContainText("timeline chart");
    await expect(
      page.getByRole("heading", { level: 1, name: "MDSE Detector Status" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Events" })).toBeVisible();
  });
});
