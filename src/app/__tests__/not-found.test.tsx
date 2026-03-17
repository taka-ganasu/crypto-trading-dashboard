import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import NotFound from "../not-found";

afterEach(() => {
  cleanup();
});

describe("NotFound page", () => {
  it("renders 404 label", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeTruthy();
  });

  it("renders Page Not Found heading", () => {
    render(<NotFound />);
    expect(screen.getByText("Page Not Found")).toBeTruthy();
  });

  it("renders Japanese explanation text", () => {
    render(<NotFound />);
    expect(
      screen.getByText(
        "お探しのページは存在しないか、移動された可能性がございます。"
      )
    ).toBeTruthy();
  });

  it("has a link back to dashboard", () => {
    render(<NotFound />);
    const link = screen.getByText("ダッシュボードに戻る");
    expect(link).toBeTruthy();
    expect(link.closest("a")?.getAttribute("href")).toBe("/");
  });
});
