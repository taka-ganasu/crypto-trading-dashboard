import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import StrategyTable from "../StrategyTable";
import type { StrategyPerformance } from "@/types";

afterEach(() => {
  cleanup();
});

const strategies: StrategyPerformance[] = [
  {
    strategy: "BTC_Momentum",
    trade_count: 42,
    win_rate: 0.65,
    profit_factor: 1.82,
    sharpe: 1.23,
    avg_pnl: 15.5,
    max_dd: -120.0,
  },
  {
    strategy: "SOL_FR",
    trade_count: 28,
    win_rate: 0.55,
    profit_factor: 1.45,
    sharpe: 0.78,
    avg_pnl: -3.2,
    max_dd: -85.0,
  },
];

describe("StrategyTable", () => {
  it("shows empty state when no strategies", () => {
    render(<StrategyTable strategies={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("No strategy data available")).toBeTruthy();
  });

  it("renders rows for each strategy", () => {
    render(<StrategyTable strategies={strategies} onSelect={vi.fn()} />);
    expect(screen.getByText("BTC_Momentum")).toBeTruthy();
    expect(screen.getByText("SOL_FR")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("28")).toBeTruthy();
  });

  it("has an accessible table label", () => {
    render(<StrategyTable strategies={strategies} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("table", { name: "Strategy comparison table" })
    ).toBeTruthy();
  });

  it("calls onSelect when a row is clicked", () => {
    const onSelect = vi.fn();
    render(<StrategyTable strategies={strategies} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("BTC_Momentum"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(strategies[0]);
  });

  it("shows SORT indicator by default for sortable columns", () => {
    render(<StrategyTable strategies={strategies} onSelect={vi.fn()} />);
    const sortLabels = screen.getAllByText("SORT");
    expect(sortLabels.length).toBe(3); // win_rate, profit_factor, sharpe
  });

  it("sorts by win_rate DESC on first click", () => {
    render(<StrategyTable strategies={strategies} onSelect={vi.fn()} />);
    const winRateBtn = screen.getByRole("button", { name: "Win Rate" });
    fireEvent.click(winRateBtn);
    expect(screen.getByText("DESC")).toBeTruthy();
    // BTC_Momentum (0.65) should be first since DESC
    const rows = screen.getAllByRole("row");
    // row[0] is header, row[1] is first data row
    expect(rows[1].textContent).toContain("BTC_Momentum");
  });

  it("toggles to ASC on second click", () => {
    render(<StrategyTable strategies={strategies} onSelect={vi.fn()} />);
    const winRateBtn = screen.getByRole("button", { name: "Win Rate" });
    fireEvent.click(winRateBtn);
    fireEvent.click(winRateBtn);
    expect(screen.getByText("ASC")).toBeTruthy();
    const rows = screen.getAllByRole("row");
    // SOL_FR (0.55) should be first in ASC
    expect(rows[1].textContent).toContain("SOL_FR");
  });

  it("shows dashes for null metrics", () => {
    const nullStrategies: StrategyPerformance[] = [
      {
        strategy: "Test",
        trade_count: 5,
        win_rate: null,
        profit_factor: null,
        sharpe: null,
        avg_pnl: null,
        max_dd: null,
      },
    ];
    render(<StrategyTable strategies={nullStrategies} onSelect={vi.fn()} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(5); // win_rate, pf, sharpe, avg_pnl, max_dd
  });

  it("resets sort when switching to different column", () => {
    render(<StrategyTable strategies={strategies} onSelect={vi.fn()} />);
    const winRateBtn = screen.getByRole("button", { name: "Win Rate" });
    const pfBtn = screen.getByRole("button", { name: "Profit Factor" });
    fireEvent.click(winRateBtn); // sort by win_rate DESC
    fireEvent.click(pfBtn); // switch to profit_factor DESC
    // profit_factor column should show DESC, win_rate should show SORT
    const sortTexts = screen.getAllByText("SORT");
    expect(sortTexts.length).toBe(2); // win_rate and sharpe
    expect(screen.getByText("DESC")).toBeTruthy();
  });
});
