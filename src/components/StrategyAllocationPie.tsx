"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface AllocationEntry {
  name: string;
  value: number;
}

interface StrategyAllocationPieProps {
  data: AllocationEntry[];
}

const COLORS = [
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#f59e0b", // amber-500
  "#a78bfa", // violet-400
  "#f87171", // red-400
  "#2dd4bf", // teal-400
  "#fb923c", // orange-400
  "#e879f9", // fuchsia-400
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs shadow-lg">
      <p className="font-medium text-zinc-300">{entry.name}</p>
      <p className="text-zinc-400 font-mono">{entry.value.toFixed(1)}%</p>
    </div>
  );
}

function renderLegendText(value: string) {
  return <span className="text-xs text-zinc-400">{value}</span>;
}

export default function StrategyAllocationPie({
  data,
}: StrategyAllocationPieProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900"
        role="img"
        aria-label="Strategy allocation chart"
      >
        <p className="text-zinc-500">No allocation data available</p>
      </div>
    );
  }

  return (
    <div
      className="h-72 w-full"
      data-testid="strategy-allocation-pie"
      role="img"
      aria-label="Strategy allocation chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, value }) => `${name} ${value}%`}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={renderLegendText} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
