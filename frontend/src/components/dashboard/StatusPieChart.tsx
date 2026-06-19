"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { tokens } from "@/lib/design-tokens";

export function StatusPieChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-slate-500">No ticket data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={tokens.chart[i % tokens.chart.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
