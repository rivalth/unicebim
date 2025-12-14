import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedContainer } from "./animated-container";
import { logger } from "@/lib/logger";
import { formatTRY } from "@/lib/money";
import { toFiniteNumber } from "@/lib/number";
import { mapProfileRow, mapTransactionRow, normalizeTransactionAmount } from "@/lib/supabase/mappers";
import { isMissingRpcFunctionError, isMissingTableError } from "@/lib/supabase/errors";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";
import BudgetSettingsForm from "@/features/profile/budget-settings-form";
import { calculateMonthlySummary } from "@/features/transactions/summary";
import TransactionHistoryPaginated from "@/features/transactions/transaction-history-paginated";
import { encodeTxCursor } from "@/lib/pagination/tx-cursor";

import AddTransactionForm from "./add-transaction-form";
import MonthPicker from "./month-picker";

function parseMonthParam(value: unknown): {
  start: Date;
  end: Date;
  label: string;
  ymd: string;
  ym: string;
  invalidParam: boolean;
} {
  const now = new Date();
  const fallbackStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const fallbackEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const formatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
  const todayYmd = now.toISOString().slice(0, 10);

  if (value == null || value === "") {
    return {
      start: fallbackStart,
      end: fallbackEnd,
      label: formatter.format(fallbackStart),
      ymd: todayYmd,
      ym: fallbackStart.toISOString().slice(0, 7),
      invalidParam: false,
    };
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return {
      start: fallbackStart,
      end: fallbackEnd,
      label: formatter.format(fallbackStart),
      ymd: todayYmd,
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
      ymd: todayYmd,
      ym: fallbackStart.toISOString().slice(0, 7),
      invalidParam: true,
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
    invalidParam: false,
  };
}

export default async function TransactionsPage({
  searchParams,
}: {
  // Next.js 16+ may provide `searchParams` as a Promise.
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const PAGE_SIZE = 50;
  const sp = await Promise.resolve(searchParams);
  const monthParam = typeof sp?.month === "string" ? sp.month : undefined;
  const month = parseMonthParam(monthParam);

  const user = await getCachedUser();

  if (!user) {
    // Protected by AppLayout; safe fallback.
    return null;
  }

  const supabase = await createSupabaseServerClient();

  // Execute database queries in parallel
  const [profileResult, fixedExpensesResult, transactionsResult, summaryResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("fixed_expenses")
      .select("id, name, amount")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, amount, type, category, date")
      .eq("user_id", user.id)
      .gte("date", month.start.toISOString())
      .lt("date", month.end.toISOString())
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1),
    supabase.rpc("get_monthly_summary", {
      p_start: month.start.toISOString(),
      p_end: month.end.toISOString(),
    }),
  ]);

  const { data: profile, error: profileError } = profileResult;
  const { data: fixedExpensesRaw, error: fixedExpensesError } = fixedExpensesResult;
  const { data: txRaw, error: txError } = transactionsResult;
  const { data: summaryRows, error: summaryError } = summaryResult;

  if (profileError) {
    logger.warn("Transactions.profile select failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  if (fixedExpensesError) {
    logger.warn("Transactions.fixed_expenses select failed", {
      code: fixedExpensesError.code,
      message: fixedExpensesError.message,
    });
  }

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
  if (isMissingTableError(fixedExpensesError)) missingTables.push("fixed_expenses");

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

  const transactionsAll = (txRaw ?? []).map(mapTransactionRow);

  const hasMore = transactionsAll.length > PAGE_SIZE;
  const transactions = hasMore ? transactionsAll.slice(0, PAGE_SIZE) : transactionsAll;
  const nextCursor =
    hasMore && transactions.length > 0
      ? encodeTxCursor({ id: transactions[transactions.length - 1]!.id, date: transactions[transactions.length - 1]!.date })
      : null;

  const summaryFromDb = summaryRows?.[0];
  const summary =
    summaryFromDb && !summaryError
      ? {
          incomeTotal: toFiniteNumber(
            (summaryFromDb as unknown as { income_total?: unknown }).income_total,
          ) ?? 0,
          expenseTotal: toFiniteNumber(
            (summaryFromDb as unknown as { expense_total?: unknown }).expense_total,
          ) ?? 0,
          netTotal: toFiniteNumber(
            (summaryFromDb as unknown as { net_total?: unknown }).net_total,
          ) ?? 0,
        }
      : null;

  if (summaryError) {
    const ctx = { code: summaryError.code, message: summaryError.message };
    if (isMissingRpcFunctionError(summaryError)) {
      logger.warn("Transactions.get_monthly_summary missing (fallback)", ctx);
    } else {
      logger.error("Transactions.get_monthly_summary failed (fallback)", ctx);
    }
  }

  let finalSummary = summary;

  if (!finalSummary) {
    // Accurate fallback when DB RPC is missing/unavailable.
    const { data: allRaw, error: allError } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("date", month.start.toISOString())
      .lt("date", month.end.toISOString());

    if (allError) {
      logger.error("Transactions.summary fallback select failed", {
        code: allError.code,
        message: allError.message,
      });
      finalSummary = { incomeTotal: 0, expenseTotal: 0, netTotal: 0 };
    } else {
      const txForSummary = (allRaw ?? []).map((t) => ({
        amount: normalizeTransactionAmount((t as unknown as { amount: unknown }).amount),
        type: t.type,
      }));
      finalSummary = calculateMonthlySummary(txForSummary);
    }
  }

  const normalizedProfile = mapProfileRow(profile);
  const monthlyBudgetGoal = normalizedProfile?.monthly_budget_goal ?? null;
  const remaining =
    monthlyBudgetGoal == null ? null : monthlyBudgetGoal - finalSummary.expenseTotal;

  return (
    <AnimatedContainer className="space-y-8">
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

      {month.invalidParam ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle>Geçersiz ay parametresi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              URL’deki <span className="font-medium text-foreground">month</span> parametresi geçersiz.
              Varsayılan olarak bu ay gösteriliyor.
            </p>
            <Link className="underline underline-offset-4" href="/transactions">
              Parametreyi temizle
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <AnimatedContainer className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gelir</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatTRY(finalSummary.incomeTotal, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gider</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatTRY(finalSummary.expenseTotal, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {formatTRY(finalSummary.netTotal, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </AnimatedContainer>

      <AnimatedContainer className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bütçe hedefi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BudgetSettingsForm
              initialMonthlyBudgetGoal={monthlyBudgetGoal}
              fixedExpenses={(fixedExpensesRaw ?? []).map((e) => ({
                id: e.id,
                name: e.name,
                amount: typeof e.amount === "number" ? e.amount : Number(e.amount),
              }))}
              monthlyFixedExpenses={normalizedProfile?.monthly_fixed_expenses ?? null}
            />
            {monthlyBudgetGoal != null ? (
              <p className="text-sm text-muted-foreground">
                Kalan:{" "}
                <span className="font-medium text-foreground">
                  {formatTRY(remaining ?? 0, { maximumFractionDigits: 2 })}
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
      </AnimatedContainer>

      <Card>
        <CardHeader>
          <CardTitle>Bu ayın işlemleri</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionHistoryPaginated
            month={month.ym}
            initialTransactions={transactions}
            initialNextCursor={nextCursor}
            pageSize={PAGE_SIZE}
          />
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}


