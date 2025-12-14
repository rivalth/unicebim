"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTRY } from "@/lib/money";
import * as React from "react";

type DailyData = {
  date: string;
  amount: number;
};

type Props = {
  data: DailyData[];
  title?: string;
  days?: number;
};

export function DailyExpenseChart({ data, title = "Günlük Harcama Trendi", days = 7 }: Props) {
  const [selectedDays, setSelectedDays] = React.useState(days);

  // Filter data based on selected days
  const filteredData = React.useMemo(() => {
    if (data.length === 0) return [];
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-selectedDays);
  }, [data, selectedDays]);

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Henüz yeterli veri yok.</p>
        </CardContent>
      </Card>
    );
  }

  // Format date labels
  const formattedData = filteredData.map((item) => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        <select
          value={selectedDays}
          onChange={(e) => setSelectedDays(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={7}>Son 7 Gün</option>
          <option value={14}>Son 14 Gün</option>
          <option value={30}>Son 30 Gün</option>
        </select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorDailyExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))", opacity: 0.5 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
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
              labelFormatter={(label) => label}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#ef4444"
              strokeWidth={2.5}
              fill="url(#colorDailyExpense)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#dc2626" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
