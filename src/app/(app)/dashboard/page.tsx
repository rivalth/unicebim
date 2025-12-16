import Link from "next/link";
import { AlertTriangle, Calendar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatedContainer } from "./animated-container";
import { calculateSmartBalance } from "@/features/dashboard/smart-balance";
import { MealIndex } from "@/features/dashboard/meal-index";
import { IncomeCountdown } from "@/features/dashboard/income-countdown";
import { SocialScore } from "@/features/dashboard/social-score";
import BudgetSettingsForm from "@/features/profile/budget-settings-form";
import AddWalletForm from "@/features/wallets/add-wallet-form";
import QuickAddTransactionDialog from "@/features/transactions/quick-add-transaction-dialog";
import TransactionHistory from "@/features/transactions/transaction-history";
import AddPaymentForm from "@/features/payments/add-payment-form";
import PaymentsList from "@/features/payments/payments-list";
import { getUpcomingPaymentsWithAnalysis } from "@/services/payment.service";
import { getUpcomingSubscriptionRenewals } from "@/services/subscription.service";
import type { PaymentAnalysisInput } from "@/features/payments/payment-analysis";
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
  const [profileResult, fixedExpensesResult, recentTransactionsResult, summaryResult, expenseTotalsResult, walletsResult, paymentsResult, subscriptionsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses, meal_price, next_income_date, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("fixed_expenses")
      .select("id, name, amount")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, amount, type, category, date, description")
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
    supabase
      .from("wallets")
      .select("id, name, balance, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    getUpcomingPaymentsWithAnalysis("dashboard"),
    getUpcomingSubscriptionRenewals(7, "dashboard"),
  ]);

  const { data: profile, error: profileError } = profileResult;
  const { data: fixedExpensesRaw, error: fixedExpensesError } = fixedExpensesResult;
  const { data: txRaw, error: txError } = recentTransactionsResult;
  const { data: summaryRows, error: summaryError } = summaryResult;
  const { data: expenseTotalsRows, error: expenseTotalsError } = expenseTotalsResult;
  const { data: walletsRaw, error: walletsError } = walletsResult;
  const payments = paymentsResult ?? [];
  const upcomingSubscriptions = subscriptionsResult ?? [];

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
    isMissingTableError(fixedExpensesError) ||
    isMissingTableError(walletsError)
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
  const mealPrice = normalizedProfile?.meal_price ?? null;
  const nextIncomeDate = normalizedProfile?.next_income_date ?? null;

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
              initialNextIncomeDate={nextIncomeDate}
              initialMealPrice={mealPrice}
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

  // Calculate unpaid payments total (Reserved Amount)
  const unpaidPayments = payments.filter((p) => !p.is_paid);
  const unpaidPaymentsTotal = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate Total Balance (Gelir - Gider)
  const totalBalance = incomeTotal - expenseTotal;

  // Calculate Safe-to-Spend Balance (Rezerv Sistemi)
  const safeToSpendBalance = totalBalance - unpaidPaymentsTotal;

  // Adjust totalMoney to account for upcoming payments (they reduce available balance)
  const totalMoney = incomeTotal > 0 ? incomeTotal : monthlyBudgetGoal ?? 0;

  const smart = calculateSmartBalance({
    totalMoney,
    expenseTotal,
    plannedFixedExpenses: monthlyFixedExpenses ?? 0,
    fixedExpensesPaid,
    now,
  });

  // Calculate average daily expense for payment analysis
  const daysElapsed = Math.max(1, now.getUTCDate());
  const averageDailyExpense = daysElapsed > 0 ? expenseTotal / daysElapsed : 0;

  // Prepare payment analysis input
  const paymentAnalysisInput: PaymentAnalysisInput | undefined = unpaidPayments.length > 0
    ? {
        currentBalance: smart.currentBalance,
        totalUnpaidPayments: unpaidPaymentsTotal,
        averageDailyExpense,
        daysRemainingInMonth: smart.remainingDaysInMonth,
        nextIncomeDate: nextIncomeDate ? new Date(nextIncomeDate) : null,
        expectedIncomeAmount: null, // Could be calculated from transaction history
        now,
      }
    : undefined;

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

  // Map wallets data (handle numeric balance)
  const wallets: Array<{ id: string; name: string; balance: number; is_default: boolean }> =
    walletsRaw && Array.isArray(walletsRaw)
      ? walletsRaw.map((w: { id: string; name: string; balance: unknown; is_default: boolean }) => ({
          id: w.id,
          name: w.name,
          balance: typeof w.balance === "number" ? w.balance : Number(w.balance) || 0,
          is_default: w.is_default,
        }))
      : [];

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Merhaba{displayName ? `, ${displayName}` : ""}.
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Bugün ne kadar yiyebilirsin?</p>
      </div>

      {/* Upcoming Subscription Renewals Alert */}
      {upcomingSubscriptions.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="size-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Yaklaşan Abonelik Ödemeleri</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {upcomingSubscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {sub.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sub.icon_url}
                      alt=""
                      className="size-6 rounded object-contain"
                      aria-hidden="true"
                    />
                  ) : (
                    <Calendar className="size-4 text-amber-600" aria-hidden="true" />
                  )}
                  <span className="font-medium">{sub.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-amber-900 dark:text-amber-100">
                    {formatTRY(sub.amount)} {sub.currency}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sub.days_until_renewal === 0
                      ? "Bugün"
                      : sub.days_until_renewal === 1
                        ? "Yarın"
                        : `${sub.days_until_renewal} gün sonra`}
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Link
                href="/dashboard/subscriptions"
                className="text-xs font-medium text-amber-900 underline underline-offset-4 hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-200"
              >
                Tüm abonelikleri görüntüle →
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Rezerv Sistemi: Safe-to-Spend Balance Card */}
      <Card
        className={`overflow-hidden border-0 shadow ${
          safeToSpendBalance < 0
            ? "bg-gradient-to-br from-destructive/20 via-destructive/10 to-background border-destructive/50"
            : "bg-gradient-to-br from-emerald-500/10 via-background to-background"
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            {safeToSpendBalance < 0 ? "⚠️ DİKKAT: Ekside Bakiyeniz Var!" : "Harcanabilir Bakiyeniz"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Ana Sayı: Safe-to-Spend Balance */}
          <div
            className={`text-3xl sm:text-5xl font-semibold tracking-tight ${
              safeToSpendBalance < 0
                ? "text-destructive"
                : safeToSpendBalance < 500
                  ? "text-amber-600"
                  : "text-emerald-600"
            }`}
          >
            {formatTRY(safeToSpendBalance)}
          </div>

          {/* Toplam Cüzdan (Daha sönük) */}
          <div className="text-xs sm:text-sm text-muted-foreground">
            Toplam Cüzdan: <span className="font-medium text-foreground">{formatTRY(totalBalance)}</span>
            {unpaidPaymentsTotal > 0 && (
              <span className="ml-2">
                (Rezerve: <span className="font-medium text-foreground">{formatTRY(unpaidPaymentsTotal)}</span>)
              </span>
            )}
          </div>

          {/* Kritik Uyarı */}
          {safeToSpendBalance < 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">
                ⚠️ Acil Durum: Ödemelerinizi karşılayamıyorsunuz!
              </p>
              <p className="text-xs text-destructive/90 mt-1">
                {unpaidPayments.length > 0 && (
                  <>
                    {unpaidPayments
                      .slice(0, 2)
                      .map((p) => {
                        const dueDate = new Date(p.due_date);
                        return `${formatTRY(p.amount)} (${dueDate.getDate()} ${["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][dueDate.getMonth()]})`;
                      })
                      .join(", ")}
                    {unpaidPayments.length > 2 && ` ve ${unpaidPayments.length - 2} ödeme daha`} için{" "}
                    {formatTRY(Math.abs(safeToSpendBalance))} TL eksiğiniz var. Acil para bulman veya
                    harcamayı kesmen lazım!
                  </>
                )}
              </p>
            </div>
          )}

          {/* Günlük Harcanabilir Limit */}
          <div className="border-t pt-3">
            <div className="text-xs sm:text-sm text-muted-foreground mb-2">
              Bugün harcanabilir limitin:{" "}
              <span className={`font-medium ${dailyColor}`}>{formatTRY(daily)}</span>
            </div>
            <div className="grid gap-2 text-xs sm:text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                Kalan gün: <span className="font-medium text-foreground">{smart.remainingDaysInMonth}</span>
              </div>
              <div>
                Kalan sabit gider:{" "}
                <span className="font-medium text-foreground">
                  {formatTRY(smart.remainingFixedExpenses)}
                </span>
              </div>
            </div>
          </div>

          {mealPrice && <MealIndex balance={safeToSpendBalance} mealPrice={mealPrice} />}
        </CardContent>
      </Card>

      {nextIncomeDate && (
        <IncomeCountdown currentBalance={smart.currentBalance} nextIncomeDate={nextIncomeDate} />
      )}

      {expenseBreakdownInput.length > 0 && <SocialScore expenseBreakdown={expenseBreakdownInput} />}

      {/* Quick Summary Cards */}
      <AnimatedContainer className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Bu Ay Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold">{formatTRY(incomeTotal)}</div>
            <Link
              href="/dashboard/stats"
              className="text-xs text-muted-foreground underline underline-offset-4 mt-1 block"
            >
              Detaylı istatistikler →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Bu Ay Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold">{formatTRY(expenseTotal)}</div>
            <Link
              href="/dashboard/reports"
              className="text-xs text-muted-foreground underline underline-offset-4 mt-1 block"
            >
              Grafikler ve raporlar →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Net Bakiye</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-semibold ${totalBalance >= 0 ? "text-emerald-600" : "text-destructive"}`}
            >
              {formatTRY(totalBalance)}
            </div>
            {unpaidPaymentsTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Rezerve edilmiş: <span className="font-medium">{formatTRY(unpaidPaymentsTotal)}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyBudgetGoal
                ? `Hedef: ${formatTRY(monthlyBudgetGoal)}`
                : "Hedef belirlenmemiş"}
            </p>
          </CardContent>
        </Card>
      </AnimatedContainer>

      <AnimatedContainer className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Hızlı işlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <QuickAddTransactionDialog />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tek ekranda: Tutar → Kategori → Kaydet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Hızlı Linkler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs sm:text-sm">
            <Link
              className="block text-foreground underline underline-offset-4 hover:text-primary"
              href="/transactions/list"
            >
              İşlem listesi →
            </Link>
            <Link
              className="block text-foreground underline underline-offset-4 hover:text-primary"
              href="/transactions/stats"
            >
              İşlem istatistikleri →
            </Link>
            <Link
              className="block text-foreground underline underline-offset-4 hover:text-primary"
              href="/dashboard/reports"
            >
              Raporlar ve grafikler →
            </Link>
          </CardContent>
        </Card>
      </AnimatedContainer>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Son İşlemler (Bu Ay)</CardTitle>
          <Link className="text-xs sm:text-sm underline underline-offset-4" href="/transactions/list">
            Tümü →
          </Link>
        </CardHeader>
        <CardContent>
          <TransactionHistory transactions={transactions.slice(0, 5)} />
          {transactions.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
              <QuickAddTransactionDialog />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Gelecek Ödemelerim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-4">
            <AddPaymentForm />
          </div>
          <PaymentsList payments={payments} analysisInput={paymentAnalysisInput} />
          {unpaidPaymentsTotal > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Toplam Ödenmemiş</span>
                <span className="font-semibold text-foreground">{formatTRY(unpaidPaymentsTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bu tutar bütçenizden düşülmüştür.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Cüzdanlarım</CardTitle>
          <Link className="text-xs sm:text-sm underline underline-offset-4" href="/transactions/list">
            Detaylar →
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-4">
            <AddWalletForm />
          </div>
          {wallets.length > 0 ? (
            <div className="space-y-2">
              {wallets.slice(0, 3).map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between border-b pb-2 text-sm">
                  <div className="flex items-center gap-2">
                    {wallet.is_default && (
                      <span className="text-xs text-muted-foreground">(Varsayılan)</span>
                    )}
                    <span className="font-medium">{wallet.name}</span>
                  </div>
                  <span className="font-semibold">{formatTRY(wallet.balance)}</span>
                </div>
              ))}
              {wallets.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{wallets.length - 3} cüzdan daha...
                </p>
              )}
              <div className="pt-2">
                <p className="text-sm font-semibold">
                  Toplam: {formatTRY(wallets.reduce((sum, w) => sum + w.balance, 0))}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz cüzdan eklenmemiş.</p>
          )}
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}


