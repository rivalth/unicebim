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

type NetBalanceData = {
  period: string;
  balance: number;
};

type Props = {
  data: NetBalanceData[];
  title?: string;
};

export function NetBalanceChart({ data, title = "Net Bakiye Trendi" }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Henüz yeterli veri yok.</p>
        </CardContent>
      </Card>
    );
  }

  // Determine if we should use positive or negative gradient based on average
  const avgBalance = data.reduce((sum, d) => sum + d.balance, 0) / data.length;
  const isPositive = avgBalance >= 0;

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorNetBalance" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "#22c55e" : "#ef4444"}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "#22c55e" : "#ef4444"}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="period"
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
              labelFormatter={(label) => `Dönem: ${label}`}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? "#22c55e" : "#ef4444"}
              strokeWidth={2.5}
              fill="url(#colorNetBalance)"
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: isPositive ? "#16a34a" : "#dc2626",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
