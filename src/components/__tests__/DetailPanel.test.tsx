import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import DetailPanel from "../DetailPanel";

afterEach(() => {
  cleanup();
});

describe("DetailPanel", () => {
  it("renders title and children when open", () => {
    render(
      <DetailPanel isOpen={true} onClose={vi.fn()} title="Test Panel">
        <p>Panel content here</p>
      </DetailPanel>
    );
    expect(screen.getByText("Test Panel")).toBeTruthy();
    expect(screen.getByText("Panel content here")).toBeTruthy();
  });

  it("has aria-hidden=false when open", () => {
    const { container } = render(
      <DetailPanel isOpen={true} onClose={vi.fn()} title="Open Panel">
        <p>Content</p>
      </DetailPanel>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("false");
  });

  it("has aria-hidden=true when closed", () => {
    const { container } = render(
      <DetailPanel isOpen={false} onClose={vi.fn()} title="Closed Panel">
        <p>Content</p>
      </DetailPanel>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
  });

  it("calls onClose when backdrop button is clicked", () => {
    const onClose = vi.fn();
    render(
      <DetailPanel isOpen={true} onClose={onClose} title="Panel">
        <p>Content</p>
      </DetailPanel>
    );
    const backdrop = screen.getByLabelText("Close details panel");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button (×) is clicked", () => {
    const onClose = vi.fn();
    render(
      <DetailPanel isOpen={true} onClose={onClose} title="Panel">
        <p>Content</p>
      </DetailPanel>
    );
    const closeBtn = screen.getByLabelText("Close panel");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key when open", () => {
    const onClose = vi.fn();
    render(
      <DetailPanel isOpen={true} onClose={onClose} title="Panel">
        <p>Content</p>
      </DetailPanel>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape key when closed", () => {
    const onClose = vi.fn();
    render(
      <DetailPanel isOpen={false} onClose={onClose} title="Panel">
        <p>Content</p>
      </DetailPanel>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders aside with dialog role and correct aria-label", () => {
    render(
      <DetailPanel isOpen={true} onClose={vi.fn()} title="Strategy Details">
        <p>Content</p>
      </DetailPanel>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Strategy Details");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
