import { expect, test, type Page } from "@playwright/test";
import { defaultApiResponses } from "./test-utils";

type ApiResponseMap = Record<string, unknown>;

type FetchMockOptions = {
  responses?: ApiResponseMap;
  statusByPath?: Record<string, number>;
  timeoutPaths?: string[];
};

async function installFetchMock(
  page: Page,
  options: FetchMockOptions = {}
): Promise<void> {
  const {
    responses = defaultApiResponses,
    statusByPath = {},
    timeoutPaths = [],
  } = options;

  await page.addInitScript(
    ({ defaultResponses, statusMap, timedOutPaths }) => {
      const responses = defaultResponses as Record<string, unknown>;
      const timeoutSet = new Set(timedOutPaths as string[]);
      const statusByPath = statusMap as Record<string, number>;
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const parsed = new URL(requestUrl, window.location.origin);

        if (!parsed.pathname.startsWith("/api/")) {
          return originalFetch(input, init);
        }

        if (timeoutSet.has(parsed.pathname)) {
          throw new Error("Request timed out (5s)");
        }

        const status = statusByPath[parsed.pathname];
        if (status != null) {
          return new Response(JSON.stringify({ detail: "forced failure" }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const payload = Object.prototype.hasOwnProperty.call(
          responses,
          parsed.pathname
        )
          ? responses[parsed.pathname]
          : {};

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };
    },
    {
      defaultResponses: responses,
      statusMap: statusByPath,
      timedOutPaths: timeoutPaths,
    }
  );
}

test("dashboard shows retry state when every dashboard API returns 500", async ({
  page,
}) => {
  await installFetchMock(page, {
    statusByPath: {
      "/api/portfolio/state": 500,
      "/api/cb/state": 500,
      "/api/trades": 500,
      "/api/health": 500,
      "/api/system/stats": 500,
    },
  });

  await page.goto("/");

  await expect(page.getByText("Failed to load dashboard data.")).toBeVisible();
  await expect(page.getByText("API server response could not be retrieved.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("portfolio shows retry guidance when portfolio state returns 500", async ({
  page,
}) => {
  await installFetchMock(page, {
    statusByPath: {
      "/api/portfolio/state": 500,
    },
  });

  await page.goto("/portfolio");

  await expect(page.getByRole("heading", { level: 1, name: "Portfolio" })).toBeVisible();
  await expect(page.getByText(/API error: 500/)).toBeVisible();
  await expect(
    page.getByText("Make sure the API server is running on port 8000")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("trades shows an inline API error banner when the trades endpoint returns 500", async ({
  page,
}) => {
  await installFetchMock(page, {
    statusByPath: {
      "/api/trades": 500,
    },
  });

  await page.goto("/trades");

  await expect(
    page.getByRole("heading", { level: 1, name: "Trade History" })
  ).toBeVisible();
  await expect(page.locator("div[role='alert']").first()).toContainText(
    "Data unavailable:"
  );
  await expect(page.getByText(/API error: 500/)).toBeVisible();
});

test("system surfaces timeout errors for the overview and error log tabs", async ({
  page,
}) => {
  await installFetchMock(page, {
    timeoutPaths: [
      "/api/system/health",
      "/api/system/metrics",
      "/api/system/info",
      "/api/health",
      "/api/errors",
    ],
  });

  await page.goto("/system");

  await expect(page.getByRole("heading", { level: 1, name: "System" })).toBeVisible();
  await expect(page.getByText("Failed to load some system data")).toBeVisible();
  await expect(
    page.getByText("Failed to fetch: health, metrics, info, bot_health")
  ).toBeVisible();

  await page.getByTestId("system-tab-error-log").click();
  await expect(page.getByText("Failed to load API error logs.")).toBeVisible();
  await expect(page.getByText("Request timed out (5s)")).toBeVisible();
});

test("mdse shows retry UI when critical API requests time out", async ({ page }) => {
  await installFetchMock(page, {
    timeoutPaths: [
      "/api/mdse/summary",
      "/api/mdse/events",
      "/api/mdse/trades",
    ],
  });

  await page.goto("/mdse");

  await expect(page.getByText("Error: Failed to load MDSE data.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
