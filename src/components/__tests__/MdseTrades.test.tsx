import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { MdseEvent, MdseTrade } from "@/types";

vi.mock("@/components/DetailPanel", () => ({
  default: ({
    isOpen,
    title,
    children,
    onClose,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="detail-panel">
        <h3>{title}</h3>
        <button type="button" onClick={onClose}>
          close panel
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/components/DetailRow", () => ({
  default: ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div data-testid="detail-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock("@/lib/format", () => ({
  formatNumber: (value: number) => `NUM:${value.toFixed(2)}`,
  formatPnl: (value: number) => `PNL:${value.toFixed(2)}`,
  colorByPnl: (value: number) => (value >= 0 ? "gain" : "loss"),
  formatTimestamp: (value: string) => `TS:${value}`,
}));

import MdseTrades from "../mdse/MdseTrades";

afterEach(cleanup);

const relatedEvents: MdseEvent[] = [
  {
    id: 100,
    detector: "oi_divergence",
    symbol: "BTC/USDT",
    direction: "long",
    confidence: 0.73,
    timestamp: "2026-03-18T00:30:00Z",
    confluence_score: 0.52,
  },
];

const trades: MdseTrade[] = [
  {
    id: 1,
    event_id: 100,
    symbol: "BTC/USDT",
    direction: "long",
    entry_price: 70000,
    exit_price: null,
    entry_time: "2026-03-18T00:00:00Z",
    exit_time: null,
    pnl: null,
    position_size: null as unknown as number,
  },
  {
    id: 2,
    event_id: 200,
    symbol: "ETH/USDT",
    direction: "short",
    entry_price: 3800,
    exit_price: 3600,
    entry_time: "2026-03-18T01:00:00Z",
    exit_time: "2026-03-18T02:00:00Z",
    pnl: 12.34,
    position_size: 1.2345,
    detector_name: "trade_override",
    confidence: 0.91,
    timestamp: "2026-03-18T02:30:00Z",
    confluence_score: 0.88,
  } as MdseTrade & {
    detector_name: string;
    confidence: number;
    timestamp: string;
    confluence_score: number;
  },
];

describe("MdseTrades", () => {
  it("renders an empty state when no trades exist", () => {
    render(<MdseTrades trades={[]} events={[]} />);

    expect(screen.getByText("No MDSE trades found")).toBeDefined();
  });

  it("renders trades and opens detail content with event fallback values", () => {
    render(<MdseTrades trades={[trades[0]]} events={relatedEvents} />);

    expect(screen.getByText("1 trades")).toBeDefined();
    expect(screen.getByText("#100")).toBeDefined();
    expect(screen.getByText("LONG").className).toContain("text-emerald-400");
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("—")).toBeDefined();

    fireEvent.click(screen.getByText("#100"));

    expect(screen.getByTestId("detail-panel")).toBeDefined();
    expect(screen.getByText("MDSE Trade Details")).toBeDefined();
    expect(screen.getByText("oi_divergence")).toBeDefined();
    expect(screen.getByText("73.0%")).toBeDefined();
    expect(screen.getByText("0.52")).toBeDefined();
    expect(screen.getByText("TS:2026-03-18T00:30:00Z")).toBeDefined();
  });

  it("prefers extra trade fields over related event data", () => {
    render(<MdseTrades trades={[trades[1]]} events={relatedEvents} />);

    expect(screen.getByText("PNL:12.34").className).toContain("gain");
    expect(screen.getByText("1.2345")).toBeDefined();

    fireEvent.click(screen.getByText("#200"));

    expect(screen.getByText("trade_override")).toBeDefined();
    expect(screen.getByText("91.0%")).toBeDefined();
    expect(screen.getByText("0.88")).toBeDefined();
    expect(screen.getByText("TS:2026-03-18T02:30:00Z")).toBeDefined();
  });
});
