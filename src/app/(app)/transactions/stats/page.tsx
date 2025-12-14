import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedContainer } from "../animated-container";
import { logger } from "@/lib/logger";
import { formatTRY } from "@/lib/money";
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

export default async function TransactionsStatsPage({
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

  // Get category totals and daily breakdown
  const [categoryTotalsResult, dailyBreakdownResult] = await Promise.all([
    supabase.rpc("get_expense_category_totals", {
      p_start: month.start.toISOString(),
      p_end: month.end.toISOString(),
    }),
    supabase
      .from("transactions")
      .select("date, amount, type")
      .eq("user_id", user.id)
      .gte("date", month.start.toISOString())
      .lt("date", month.end.toISOString())
      .order("date", { ascending: true }),
  ]);

  const { data: categoryTotals } = categoryTotalsResult;
  const { data: dailyBreakdown } = dailyBreakdownResult;

  // Process daily breakdown
  const dailyMap = new Map<string, { income: number; expense: number }>();
  dailyBreakdown?.forEach((tx) => {
    const dayKey = new Date(tx.date).toISOString().split("T")[0];
    const amount = toFiniteNumber((tx as unknown as { amount?: unknown }).amount) ?? 0;
    const current = dailyMap.get(dayKey) || { income: 0, expense: 0 };
    if (tx.type === "income") {
      current.income += amount;
    } else {
      current.expense += amount;
    }
    dailyMap.set(dayKey, current);
  });

  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, totals]) => ({
      date,
      ...totals,
      net: totals.income - totals.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalCategoryAmount = categoryTotals?.reduce(
    (sum, item) => sum + (toFiniteNumber((item as unknown as { total?: unknown }).total) ?? 0),
    0,
  ) ?? 0;

  const maxDailyExpense = dailyStats.reduce((max, day) => Math.max(max, day.expense), 0);
  const avgDailyExpense =
    dailyStats.length > 0
      ? dailyStats.reduce((sum, day) => sum + day.expense, 0) / dailyStats.length
      : 0;

  return (
    <AnimatedContainer className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">İşlem İstatistikleri</h1>
          <p className="text-sm text-muted-foreground">{month.label}</p>
        </div>

        <div className="flex items-end gap-4">
          <MonthPicker initialMonth={month.ym} />
          <Link className="text-sm underline underline-offset-4" href="/transactions/list">
            Listeye Dön
          </Link>
        </div>
      </div>

      {/* Category Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Kategori Bazlı İstatistikler</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryTotals && categoryTotals.length > 0 ? (
            <div className="space-y-4">
              {categoryTotals.map((item) => {
                const amount = toFiniteNumber((item as unknown as { total?: unknown }).total) ?? 0;
                const percentage = totalCategoryAmount > 0 ? (amount / totalCategoryAmount) * 100 : 0;

                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">{formatTRY(amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% toplam gider içinde
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Bu ay için kategori verisi yok.</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Statistics */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">En Yüksek Günlük Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTRY(maxDailyExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {maxDailyExpense > 0
                ? dailyStats.find((d) => d.expense === maxDailyExpense)?.date
                : "Veri yok"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ortalama Günlük Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTRY(avgDailyExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dailyStats.length} günün ortalaması
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Günlük Detay</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dailyStats.map((day) => (
                <div key={day.date} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div>
                    <div className="font-medium">
                      {new Date(day.date).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Gelir: {formatTRY(day.income)} • Gider: {formatTRY(day.expense)}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${day.net >= 0 ? "text-emerald-600" : "text-destructive"}`}
                  >
                    {formatTRY(day.net)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Bu ay için günlük veri yok.</p>
          )}
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}
