import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { toFiniteNumber } from "@/lib/number";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateMonthlySummary } from "@/features/transactions/summary";

import AddTransactionForm from "./add-transaction-form";
import BudgetGoalForm from "./budget-goal-form";
import MonthPicker from "./month-picker";

function parseMonthParam(value: unknown): {
  start: Date;
  end: Date;
  label: string;
  ymd: string;
  ym: string;
} {
  const now = new Date();
  const fallbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fallbackEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const formatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
  const todayYmd = now.toISOString().slice(0, 10);

  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return {
      start: fallbackStart,
      end: fallbackEnd,
      label: formatter.format(fallbackStart),
      ymd: todayYmd,
      ym: fallbackStart.toISOString().slice(0, 7),
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
      ymd: todayYmd,
      ym: fallbackStart.toISOString().slice(0, 7),
    };
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const withinSelectedMonth = now >= start && now < end;

  return {
    start,
    end,
    label: formatter.format(start),
    ymd: withinSelectedMonth ? todayYmd : start.toISOString().slice(0, 10),
    ym: start.toISOString().slice(0, 7),
  };
}

function formatTRY(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const monthParam = typeof searchParams?.month === "string" ? searchParams.month : undefined;
  const month = parseMonthParam(monthParam);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Transactions.getUser failed", { message: userError.message });
  }

  if (!user) {
    // Protected by AppLayout; safe fallback.
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("monthly_budget_goal, monthly_fixed_expenses")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.warn("Transactions.profile select failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  const { data: txRaw, error: txError } = await supabase
    .from("transactions")
    .select("id, amount, type, category, date")
    .eq("user_id", user.id)
    .gte("date", month.start.toISOString())
    .lt("date", month.end.toISOString())
    .order("date", { ascending: false });

  if (txError) {
    if (isMissingTableError(txError)) {
      logger.warn("Transactions table missing", { code: txError.code, message: txError.message });
    } else {
      logger.error("Transactions.select failed", { code: txError.code, message: txError.message });
    }
  }

  const missingTables: string[] = [];
  if (isMissingTableError(profileError)) missingTables.push("profiles");
  if (isMissingTableError(txError)) missingTables.push("transactions");

  if (missingTables.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">İşlemler</h1>
          <p className="text-sm text-muted-foreground">
            Supabase veritabanı kurulumu tamamlanmamış görünüyor.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>DB kurulumu gerekli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Supabase tarafında şu tablolar bulunamadı:{" "}
              <span className="font-medium text-foreground">
                {missingTables.join(", ")}
              </span>
              .
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Supabase Dashboard → SQL Editor’de{" "}
                <span className="font-medium text-foreground">docs/supabase.sql</span>{" "}
                dosyasını çalıştırın.
              </li>
              <li>
                Ardından Supabase Dashboard → Settings → API →{" "}
                <span className="font-medium text-foreground">Reload schema</span> yapın
                (gerekirse).
              </li>
              <li>
                Bu projede kullanılan Supabase projesinin doğru olduğundan emin olun (
                <span className="font-medium text-foreground">
                  NEXT_PUBLIC_SUPABASE_URL
                </span>
                ).
              </li>
            </ol>

            <div className="pt-2">
              <Link className="underline underline-offset-4" href="/dashboard">
                Dashboard’a dön
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const transactions = (txRaw ?? []).map((t) => {
    const rawAmount = (t as unknown as { amount: unknown }).amount;
    const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
    return {
      ...t,
      amount: Number.isFinite(amount) ? amount : 0,
    };
  });

  const summary = calculateMonthlySummary(
    transactions.map((t) => ({ amount: t.amount, type: t.type })),
  );

  const monthlyBudgetGoal = toFiniteNumber(
    (profile as unknown as { monthly_budget_goal?: unknown })?.monthly_budget_goal,
  );
  const monthlyFixedExpenses = toFiniteNumber(
    (profile as unknown as { monthly_fixed_expenses?: unknown })?.monthly_fixed_expenses,
  );
  const remaining =
    monthlyBudgetGoal == null ? null : monthlyBudgetGoal - summary.expenseTotal;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">İşlemler</h1>
          <p className="text-sm text-muted-foreground">{month.label}</p>
        </div>

        <div className="flex items-end gap-4">
          <MonthPicker initialMonth={month.ym} />
          <Link className="text-sm underline underline-offset-4" href="/dashboard">
            Dashboard’a dön
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gelir</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatTRY(summary.incomeTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gider</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatTRY(summary.expenseTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatTRY(summary.netTotal)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bütçe hedefi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BudgetGoalForm
              initialMonthlyBudgetGoal={monthlyBudgetGoal}
              initialMonthlyFixedExpenses={monthlyFixedExpenses}
            />
            {monthlyBudgetGoal != null ? (
              <p className="text-sm text-muted-foreground">
                Kalan:{" "}
                <span className="font-medium text-foreground">
                  {formatTRY(remaining ?? 0)}
                </span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yeni işlem ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTransactionForm defaultDate={month.ymd} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bu ayın işlemleri</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
          ) : (
            <ul className="divide-y">
              {transactions.map((t) => (
                <li className="flex items-center justify-between gap-4 py-3" key={t.id}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.category}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("tr-TR")} •{" "}
                      {t.type === "income" ? "Gelir" : "Gider"}
                    </div>
                  </div>
                  <div
                    className={
                      t.type === "income"
                        ? "text-sm font-medium text-emerald-600"
                        : "text-sm font-medium text-rose-600"
                    }
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatTRY(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


