"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTRY } from "@/lib/money";

type MonthlyData = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

type Props = {
  data: MonthlyData[];
};

export function MonthlyTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">6 Aylık Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Henüz yeterli veri yok.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">6 Aylık Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Gelir gradient - yeşil tonları */}
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
              {/* Gider gradient - kırmızı tonları */}
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
              {/* Net gradient - mavi tonları */}
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="month"
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
              labelFormatter={(label) => `Ay: ${label}`}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "16px" }}
              iconType="line"
              formatter={(value) => (
                <span style={{ color: "hsl(var(--foreground))", fontSize: "13px" }}>
                  {value}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={2.5}
              fill="url(#colorIncome)"
              name="Gelir"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#16a34a" }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2.5}
              fill="url(#colorExpense)"
              name="Gider"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#dc2626" }}
            />
            <Area
              type="monotone"
              dataKey="net"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#colorNet)"
              name="Net"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#2563eb" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
