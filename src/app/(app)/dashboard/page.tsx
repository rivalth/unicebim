import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedContainer } from "./animated-container";
import {
  buildConicGradient,
  getExpenseBreakdown,
  getRealityCheckMessage,
} from "@/features/dashboard/expense-breakdown";
import { calculateSmartBalance } from "@/features/dashboard/smart-balance";
import BudgetSettingsForm from "@/features/profile/budget-settings-form";
import QuickAddTransactionDialog from "@/features/transactions/quick-add-transaction-dialog";
import TransactionHistory from "@/features/transactions/transaction-history";
import { logger } from "@/lib/logger";
import { formatTRY } from "@/lib/money";
import { toFiniteNumber } from "@/lib/number";
import { mapProfileRow, mapTransactionRow, normalizeTransactionAmount } from "@/lib/supabase/mappers";
import { isMissingRpcFunctionError, isMissingTableError } from "@/lib/supabase/errors";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getCachedUser();

  // AppLayout already redirects unauthenticated users; keep a safe fallback.
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  // Calculate month range (local computation, no I/O)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  // Execute database queries in parallel
  const [profileResult, fixedExpensesResult, recentTransactionsResult, summaryResult, expenseTotalsResult] = await Promise.all([
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
      .gte("date", monthStart.toISOString())
      .lt("date", monthEnd.toISOString())
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .limit(20),
    supabase.rpc("get_monthly_summary", {
      p_start: monthStart.toISOString(),
      p_end: monthEnd.toISOString(),
    }),
    supabase.rpc("get_expense_category_totals", {
      p_start: monthStart.toISOString(),
      p_end: monthEnd.toISOString(),
    }),
  ]);

  const { data: profile, error: profileError } = profileResult;
  const { data: fixedExpensesRaw, error: fixedExpensesError } = fixedExpensesResult;
  const { data: txRaw, error: txError } = recentTransactionsResult;
  const { data: summaryRows, error: summaryError } = summaryResult;
  const { data: expenseTotalsRows, error: expenseTotalsError } = expenseTotalsResult;

  if (profileError) {
    logger.warn("Dashboard.profile select failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  if (fixedExpensesError) {
    logger.warn("Dashboard.fixed_expenses select failed", {
      code: fixedExpensesError.code,
      message: fixedExpensesError.message,
    });
  }

  if (txError) {
    logger.warn("Dashboard.transactions select failed", { code: txError.code, message: txError.message });
  }

  if (
    isMissingTableError(profileError) ||
    isMissingTableError(txError) ||
    isMissingTableError(fixedExpensesError)
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Supabase veritabanı kurulumu tamamlanmamış görünüyor.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>DB kurulumu gerekli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">profiles</span> ve/veya{" "}
              <span className="font-medium text-foreground">transactions</span> tablosu
              bulunamadı. Supabase SQL Editor’de{" "}
              <span className="font-medium text-foreground">docs/supabase.sql</span> dosyasını
              çalıştırın.
            </p>
            <Link className="underline underline-offset-4" href="/transactions">
              İşlemler sayfasına git
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const normalizedProfile = mapProfileRow(profile);

  const displayName =
    normalizedProfile?.full_name ?? (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null);

  const monthlyBudgetGoal = normalizedProfile?.monthly_budget_goal ?? null;
  const monthlyFixedExpenses = normalizedProfile?.monthly_fixed_expenses ?? null;

  // Onboarding: Show budget setup if monthly budget goal is not set or is zero.
  // Note: `0` is invalid per schema (requires positive), so treat it as unset and show onboarding.
  const needsOnboarding = monthlyBudgetGoal == null || monthlyBudgetGoal === 0;

  if (needsOnboarding) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Merhaba{displayName ? `, ${displayName}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground">
            UniCebim&apos;e hoş geldin! Başlamak için aylık bütçe hedefini belirle.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bütçe ayarlarını yap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Aylık hedef bütçeni ve sabit giderlerini girerek &quot;Bugün ne kadar yiyebilirim?&quot;
              özelliğini kullanmaya başlayabilirsin.
            </p>
            <BudgetSettingsForm
              initialMonthlyBudgetGoal={monthlyBudgetGoal}
              fixedExpenses={(fixedExpensesRaw ?? []).map((e) => ({
                id: e.id,
                name: e.name,
                amount: typeof e.amount === "number" ? e.amount : Number(e.amount),
              }))}
              monthlyFixedExpenses={monthlyFixedExpenses}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hızlı işlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAddTransactionDialog />
            <p className="text-sm text-muted-foreground">
              Bütçe ayarlarını yaptıktan sonra gelir ve giderlerini ekleyebilirsin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const transactions = (txRaw ?? []).map(mapTransactionRow);

  const summaryFromDb = summaryRows?.[0];

  let incomeTotal = 0;
  let expenseTotal = 0;
  let fixedExpensesPaid = 0;

  if (summaryFromDb && !summaryError) {
    incomeTotal =
      toFiniteNumber((summaryFromDb as unknown as { income_total?: unknown }).income_total) ?? 0;
    expenseTotal =
      toFiniteNumber((summaryFromDb as unknown as { expense_total?: unknown }).expense_total) ?? 0;
    fixedExpensesPaid =
      toFiniteNumber(
        (summaryFromDb as unknown as { fixed_expenses_paid?: unknown }).fixed_expenses_paid,
      ) ?? 0;
  } else {
    if (summaryError) {
      const ctx = { code: summaryError.code, message: summaryError.message };
      if (isMissingRpcFunctionError(summaryError)) {
        logger.warn("Dashboard.get_monthly_summary missing (fallback)", ctx);
      } else {
        logger.error("Dashboard.get_monthly_summary failed (fallback)", ctx);
      }
    }

    // Accurate fallback when RPC is missing/unavailable.
    const { data: allRaw, error: allError } = await supabase
      .from("transactions")
      .select("amount, type, category")
      .eq("user_id", user.id)
      .gte("date", monthStart.toISOString())
      .lt("date", monthEnd.toISOString());

    if (allError) {
      logger.error("Dashboard.summary fallback select failed", {
        code: allError.code,
        message: allError.message,
      });
    } else {
      for (const t of allRaw ?? []) {
        const amount = normalizeTransactionAmount(
          (t as unknown as { amount: unknown }).amount,
        );
        if (t.type === "income") incomeTotal += amount;
        else {
          expenseTotal += amount;
          if (t.category === "Sabitler") fixedExpensesPaid += amount;
        }
      }
    }
  }

  const totalMoney = incomeTotal > 0 ? incomeTotal : monthlyBudgetGoal ?? 0;

  const smart = calculateSmartBalance({
    totalMoney,
    expenseTotal,
    plannedFixedExpenses: monthlyFixedExpenses ?? 0,
    fixedExpensesPaid,
    now,
  });

  const daily = Math.round(smart.todaySpendableLimit);
  const dailyColor =
    daily < 0 ? "text-destructive" : daily < 100 ? "text-amber-600" : "text-emerald-600";

  let expenseBreakdownInput: Array<{ category: string; amount: number }> = [];

  if (expenseTotalsRows && !expenseTotalsError) {
    expenseBreakdownInput = expenseTotalsRows.map((r) => ({
      category: r.category,
      amount: toFiniteNumber((r as unknown as { total?: unknown }).total) ?? 0,
    }));
  } else {
    if (expenseTotalsError) {
      const ctx = { code: expenseTotalsError.code, message: expenseTotalsError.message };
      if (isMissingRpcFunctionError(expenseTotalsError)) {
        logger.warn("Dashboard.get_expense_category_totals missing (fallback)", ctx);
      } else {
        logger.error("Dashboard.get_expense_category_totals failed (fallback)", ctx);
      }
    }

    // Fallback: pull category+amount for expenses only (still less data than full tx rows).
    const { data: expensesRaw, error: expensesError } = await supabase
      .from("transactions")
      .select("category, amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", monthStart.toISOString())
      .lt("date", monthEnd.toISOString());

    if (expensesError) {
      logger.error("Dashboard.expense breakdown fallback select failed", {
        code: expensesError.code,
        message: expensesError.message,
      });
    } else {
      expenseBreakdownInput = (expensesRaw ?? []).map((e) => ({
        category: e.category,
        amount: normalizeTransactionAmount((e as unknown as { amount: unknown }).amount),
      }));
    }
  }

  const expenseBreakdown = getExpenseBreakdown(expenseBreakdownInput);
  const expenseGradient = buildConicGradient(expenseBreakdown.slices);
  const realityCheck = getRealityCheckMessage(expenseBreakdown.slices);

  return (
    <AnimatedContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Merhaba{displayName ? `, ${displayName}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">Bugün ne kadar yiyebilirsin?</p>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-background to-background shadow">
        <CardHeader>
          <CardTitle>Bugün harcanabilir limitin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className={`text-5xl font-semibold tracking-tight ${dailyColor}`}>
            {formatTRY(daily)}
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              Kalan gün: <span className="font-medium text-foreground">{smart.remainingDaysInMonth}</span>
            </div>
            <div>
              Kalan sabit gider:{" "}
              <span className="font-medium text-foreground">
                {formatTRY(smart.remainingFixedExpenses)}
              </span>
            </div>
            <div>
              Ay toplam para:{" "}
              <span className="font-medium text-foreground">{formatTRY(totalMoney)}</span>
            </div>
            <div>
              Kalan bakiye:{" "}
              <span className="font-medium text-foreground">{formatTRY(smart.currentBalance)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Not: Gelir girdiysen “ay toplam para” gelir toplamıdır; gelir girmediysen aylık hedef bütçe
            kullanılır.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reality Check (Bu Ay)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 sm:items-center">
          <div className="flex items-center justify-center">
            <div
              className="relative size-40 rounded-full border bg-background"
              style={{ background: expenseGradient }}
            >
              <div className="absolute inset-5 flex items-center justify-center rounded-full bg-background">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Toplam gider</div>
                  <div className="text-sm font-semibold">
                    {formatTRY(expenseBreakdown.total)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{realityCheck}</p>

            {expenseBreakdown.slices.length > 0 ? (
              <ul className="space-y-2">
                {expenseBreakdown.slices.map((s) => (
                  <li className="flex items-center justify-between text-sm" key={s.category}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{s.category}</span>
                    </div>
                    <div className="tabular-nums text-foreground">
                      %{Math.round(s.percent * 100)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">Bu ay henüz gider yok.</p>
                <QuickAddTransactionDialog />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatedContainer className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hızlı işlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAddTransactionDialog />
            <p className="text-sm text-muted-foreground">
              Tek ekranda: Tutar → Kategori → Kaydet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bu ay</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            İşlemlerini{" "}
            <Link className="text-foreground underline underline-offset-4" href="/transactions">
              İşlemler
            </Link>{" "}
            sayfasından görüntüleyebilirsin.
          </CardContent>
        </Card>
      </AnimatedContainer>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Şeffaf cüzdan geçmişi (Bu Ay)</CardTitle>
          <Link className="text-sm underline underline-offset-4" href="/transactions">
            Tümü
          </Link>
        </CardHeader>
        <CardContent>
          <TransactionHistory transactions={transactions} />
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}


