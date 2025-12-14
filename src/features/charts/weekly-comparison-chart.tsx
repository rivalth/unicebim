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

type WeeklyData = {
  week: string;
  current: number;
  previous?: number;
};

type Props = {
  data: WeeklyData[];
  title?: string;
};

export function WeeklyComparisonChart({ data, title = "Haftalık Karşılaştırma" }: Props) {
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

  const hasPrevious = data.some((d) => d.previous !== undefined);

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
              <linearGradient id="colorCurrentWeek" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              {hasPrevious && (
                <linearGradient id="colorPreviousWeek" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.05} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="week"
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
              formatter={(value: number, name: string) => [
                formatTRY(value),
                name === "current" ? "Bu Hafta" : "Geçen Hafta",
              ]}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
              labelFormatter={(label) => `Hafta: ${label}`}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            {hasPrevious && (
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                iconType="line"
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--foreground))", fontSize: "13px" }}>
                    {value === "current" ? "Bu Hafta" : "Geçen Hafta"}
                  </span>
                )}
              />
            )}
            <Area
              type="monotone"
              dataKey="current"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#colorCurrentWeek)"
              name="current"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#2563eb" }}
            />
            {hasPrevious && (
              <Area
                type="monotone"
                dataKey="previous"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#colorPreviousWeek)"
                name="previous"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#9333ea" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
