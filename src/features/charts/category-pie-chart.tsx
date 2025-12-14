"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTRY } from "@/lib/money";

type CategoryData = {
  category: string;
  amount: number;
  color: string;
};

type Props = {
  data: CategoryData[];
};

const COLORS = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
];

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Kategori Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Henüz gider verisi yok.</p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // Sort data by amount (descending) for better visualization
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">Kategori Dağılımı</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              dataKey="amount"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || COLORS[index % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "8px 12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value: number) => formatTRY(value)}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-6 space-y-3">
          <div className="text-sm font-semibold text-foreground">
            Toplam: <span className="text-base">{formatTRY(total)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sortedData.map((item, index) => {
              const percentage = ((item.amount / total) * 100).toFixed(1);
              return (
                <div
                  key={item.category}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground flex-1 truncate">{item.category}</span>
                  <span className="font-medium text-foreground shrink-0">{formatTRY(item.amount)}</span>
                  <span className="text-muted-foreground shrink-0">({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
