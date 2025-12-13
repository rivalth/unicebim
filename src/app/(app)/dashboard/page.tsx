import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSmartBalance } from "@/features/dashboard/smart-balance";
import QuickAddTransactionDialog from "@/features/transactions/quick-add-transaction-dialog";
import TransactionHistory from "@/features/transactions/transaction-history";
import { logger } from "@/lib/logger";
import { toFiniteNumber } from "@/lib/number";
import { isMissingTableError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatTRY(amount: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits,
  }).format(amount);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.warn("Dashboard.getUser failed", { message: userError.message });
  }

  // AppLayout already redirects unauthenticated users; keep a safe fallback.
  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, monthly_budget_goal, monthly_fixed_expenses")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.warn("Dashboard.profile select failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const { data: txRaw, error: txError } = await supabase
    .from("transactions")
    .select("id, amount, type, category, date")
    .eq("user_id", user.id)
    .gte("date", monthStart.toISOString())
    .lt("date", monthEnd.toISOString())
    .order("date", { ascending: false });

  if (txError) {
    logger.warn("Dashboard.transactions select failed", { code: txError.code, message: txError.message });
  }

  if (isMissingTableError(profileError) || isMissingTableError(txError)) {
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

  const displayName =
    profile?.full_name ?? (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null);

  const monthlyBudgetGoal = toFiniteNumber(
    (profile as unknown as { monthly_budget_goal?: unknown })?.monthly_budget_goal,
  );
  const monthlyFixedExpenses = toFiniteNumber(
    (profile as unknown as { monthly_fixed_expenses?: unknown })?.monthly_fixed_expenses,
  );

  const transactions = (txRaw ?? []).map((t) => {
    const rawAmount = (t as unknown as { amount: unknown }).amount;
    const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
    return {
      ...t,
      amount: Number.isFinite(amount) ? amount : 0,
    };
  });

  let incomeTotal = 0;
  let expenseTotal = 0;
  let fixedExpensesPaid = 0;

  for (const t of transactions) {
    if (t.type === "income") incomeTotal += t.amount;
    else {
      expenseTotal += t.amount;
      if (t.category === "Sabitler") fixedExpensesPaid += t.amount;
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

  return (
    <div className="space-y-6">
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
            {formatTRY(daily, 0)}
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              Kalan gün: <span className="font-medium text-foreground">{smart.remainingDaysInMonth}</span>
            </div>
            <div>
              Kalan sabit gider:{" "}
              <span className="font-medium text-foreground">
                {formatTRY(smart.remainingFixedExpenses, 0)}
              </span>
            </div>
            <div>
              Ay toplam para:{" "}
              <span className="font-medium text-foreground">{formatTRY(totalMoney, 0)}</span>
            </div>
            <div>
              Kalan bakiye:{" "}
              <span className="font-medium text-foreground">{formatTRY(smart.currentBalance, 0)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Not: Gelir girdiysen “ay toplam para” gelir toplamıdır; gelir girmediysen aylık hedef bütçe
            kullanılır.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Şeffaf cüzdan geçmişi (Bu Ay)</CardTitle>
          <Link className="text-sm underline underline-offset-4" href="/transactions">
            Tümü
          </Link>
        </CardHeader>
        <CardContent>
          <TransactionHistory transactions={transactions.slice(0, 20)} />
        </CardContent>
      </Card>
    </div>
  );
}


