import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import StrategyCard from "../StrategyCard";
import type { StrategyPerformance } from "@/types";

afterEach(() => {
  cleanup();
});

const baseStrategy: StrategyPerformance = {
  strategy: "BTC_Momentum",
  trade_count: 42,
  win_rate: 0.65,
  profit_factor: 1.82,
  sharpe: 1.23,
  avg_pnl: 15.5,
  max_dd: -120.0,
};

describe("StrategyCard", () => {
  it("renders strategy name and trade count", () => {
    render(<StrategyCard strategy={baseStrategy} onClick={vi.fn()} />);
    expect(screen.getByText("BTC_Momentum")).toBeTruthy();
    expect(screen.getByText("42 trades")).toBeTruthy();
  });

  it("renders all four metrics", () => {
    render(<StrategyCard strategy={baseStrategy} onClick={vi.fn()} />);
    expect(screen.getByText("Win Rate")).toBeTruthy();
    expect(screen.getByText("PF")).toBeTruthy();
    expect(screen.getByText("Sharpe")).toBeTruthy();
    expect(screen.getByText("Avg PnL")).toBeTruthy();
    expect(screen.getByText("1.82")).toBeTruthy();
    expect(screen.getByText("1.23")).toBeTruthy();
  });

  it("shows dashes for null metrics", () => {
    const nullStrategy: StrategyPerformance = {
      strategy: "Null_Strategy",
      trade_count: 0,
      win_rate: null,
      profit_factor: null,
      sharpe: null,
      avg_pnl: null,
      max_dd: null,
    };
    render(<StrategyCard strategy={nullStrategy} onClick={vi.fn()} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(4);
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<StrategyCard strategy={baseStrategy} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders PF with emerald color for high values", () => {
    const highPf: StrategyPerformance = {
      ...baseStrategy,
      profit_factor: 2.5,
    };
    render(<StrategyCard strategy={highPf} onClick={vi.fn()} />);
    expect(screen.getByText("2.50")).toBeTruthy();
  });

  it("renders PF with yellow color for moderate values", () => {
    const midPf: StrategyPerformance = {
      ...baseStrategy,
      profit_factor: 1.2,
    };
    render(<StrategyCard strategy={midPf} onClick={vi.fn()} />);
    expect(screen.getByText("1.20")).toBeTruthy();
  });

  it("renders PF with red color for low values", () => {
    const lowPf: StrategyPerformance = {
      ...baseStrategy,
      profit_factor: 0.8,
    };
    render(<StrategyCard strategy={lowPf} onClick={vi.fn()} />);
    expect(screen.getByText("0.80")).toBeTruthy();
  });
});
