import Link from "next/link";

import { AnimatedContainer } from "../animated-container";
import { CategoryPieChart } from "@/features/charts/category-pie-chart";
import { MonthlyTrendChart } from "@/features/charts/monthly-trend-chart";
import { logger } from "@/lib/logger";
import { toFiniteNumber } from "@/lib/number";
import { isMissingRpcFunctionError } from "@/lib/supabase/errors";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import MonthPicker from "../month-picker";

function parseMonthParam(value: unknown): {
  start: Date;
  end: Date;
  label: string;
  ym: string;
  invalidParam: boolean;
} {
  const now = new Date();
  const fallbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fallbackEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const formatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });

  if (value == null || value === "") {
    return {
      start: fallbackStart,
      end: fallbackEnd,
      label: formatter.format(fallbackStart),
      ym: fallbackStart.toISOString().slice(0, 7),
      invalidParam: false,
    };
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return {
      start: fallbackStart,
      end: fallbackEnd,
      label: formatter.format(fallbackStart),
      ym: fallbackStart.toISOString().slice(0, 7),
      invalidParam: typeof value === "string",
    };
  }

  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return {
      start: fallbackStart,
      end: fallbackEnd,
      label: formatter.format(fallbackStart),
      ym: fallbackStart.toISOString().slice(0, 7),
      invalidParam: false,
    };
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    start,
    end,
    label: formatter.format(start),
    ym: start.toISOString().slice(0, 7),
    invalidParam: false,
  };
}

export default async function TransactionsChartsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCachedUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const sp = await Promise.resolve(searchParams);
  const monthParam = typeof sp?.month === "string" ? sp.month : undefined;
  const month = parseMonthParam(monthParam);

  // Get expense breakdown for current month
  const [expenseTotalsResult] = await Promise.all([
    supabase.rpc("get_expense_category_totals", {
      p_start: month.start.toISOString(),
      p_end: month.end.toISOString(),
    }),
  ]);

  // Get monthly summaries for each of the last 6 months for trend chart
  const monthlyTrends = [];
  for (let i = 5; i >= 0; i--) {
    const monthStartDate = new Date(month.start);
    monthStartDate.setMonth(monthStartDate.getMonth() - i);
    const monthEndDate = new Date(monthStartDate);
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);

    const { data: summaryData } = await supabase.rpc("get_monthly_summary", {
      p_start: monthStartDate.toISOString(),
      p_end: monthEndDate.toISOString(),
    });

    if (summaryData && summaryData[0]) {
      const income = toFiniteNumber((summaryData[0] as unknown as { income_total?: unknown }).income_total) ?? 0;
      const expense = toFiniteNumber((summaryData[0] as unknown as { expense_total?: unknown }).expense_total) ?? 0;
      const net = toFiniteNumber((summaryData[0] as unknown as { net_total?: unknown }).net_total) ?? 0;
      const monthName = monthStartDate.toLocaleDateString("tr-TR", { month: "short" });

      monthlyTrends.push({
        month: monthName,
        income,
        expense,
        net,
      });
    }
  }

  // Process category data for pie chart
  const categoryDataRaw = expenseTotalsResult.data || [];
  const COLORS = [
    "#ef4444", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
    "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  ];
  const categoryData = categoryDataRaw.map((item, index) => ({
    category: item.category,
    amount: toFiniteNumber((item as unknown as { total?: unknown }).total) ?? 0,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">İşlem Grafikleri</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{month.label}</p>
        </div>

        <div className="flex items-end gap-4">
          <MonthPicker initialMonth={month.ym} />
          <Link className="text-sm underline underline-offset-4" href="/transactions/list">
            Listeye Dön
          </Link>
        </div>
      </div>

      <MonthlyTrendChart data={monthlyTrends} />
      <CategoryPieChart data={categoryData} />
    </AnimatedContainer>
  );
}
