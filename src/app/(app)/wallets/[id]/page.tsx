import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedContainer } from "@/app/(app)/dashboard/animated-container";
import TransactionHistory from "@/features/transactions/transaction-history";
import { getWalletById } from "@/services/wallet.service";
import { formatTRY } from "@/lib/money";
import { mapTransactionRow } from "@/lib/supabase/mappers";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCachedUser();

  if (!user) {
    return null;
  }

  const wallet = await getWalletById(id);
  if (!wallet) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  // Get transactions for this wallet
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const { data: txRaw } = await supabase
    .from("transactions")
    .select("id, amount, type, category, date, wallet_id, wallets(id, name)")
    .eq("user_id", user.id)
    .eq("wallet_id", id)
    .gte("date", monthStart.toISOString())
    .lt("date", monthEnd.toISOString())
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);

  const transactions = (txRaw ?? []).map((t) => {
    const mapped = mapTransactionRow(t);
    const wallet = (t as unknown as { wallets?: { id: string; name: string } | null }).wallets;
    return {
      ...mapped,
      wallet_id: t.wallet_id || null,
      wallet_name: wallet?.name || null,
    };
  });

  // Calculate income and expense totals for this wallet
  const incomeTotal = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const netTotal = incomeTotal - expenseTotal;

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{wallet.name}</h1>
          {wallet.is_default && (
            <p className="text-xs sm:text-sm text-muted-foreground">Varsayılan cüzdan</p>
          )}
        </div>
      </div>

      <AnimatedContainer className="grid gap-3 sm:gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Wallet className="size-4" aria-hidden="true" />
              Bakiye
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg sm:text-xl font-bold">
            {formatTRY(wallet.balance, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Gelir</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-emerald-600 font-medium">
            {formatTRY(incomeTotal, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Gider</CardTitle>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm text-rose-600 font-medium">
            {formatTRY(expenseTotal, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Net</CardTitle>
          </CardHeader>
          <CardContent
            className={`text-xs sm:text-sm font-medium ${
              netTotal >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {netTotal >= 0 ? "+" : ""}
            {formatTRY(netTotal, { maximumFractionDigits: 2 })}
          </CardContent>
        </Card>
      </AnimatedContainer>

      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Bu ayın işlemleri</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Bu cüzdan için henüz işlem yok.</p>
              <Button asChild variant="outline">
                <Link href="/transactions/list">İşlem Ekle</Link>
              </Button>
            </div>
          ) : (
            <TransactionHistory transactions={transactions} />
          )}
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}

