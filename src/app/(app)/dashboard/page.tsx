import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { toFiniteNumber } from "@/lib/number";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PGRST205"
  );
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
    .select("full_name, monthly_budget_goal")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.warn("Dashboard.profile select failed", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  if (isMissingTableError(profileError)) {
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
              <span className="font-medium text-foreground">profiles</span> tablosu
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Merhaba{displayName ? `, ${displayName}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Bütçe hedefin ve harcamaların burada özetlenecek.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aylık hedef bütçe</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {monthlyBudgetGoal != null ? `${monthlyBudgetGoal} ₺` : "Henüz belirlenmedi."}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bu ayki özet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gelir/gider toplamlarını ve işlemlerini{" "}
            <Link className="text-foreground underline underline-offset-4" href="/transactions">
              İşlemler
            </Link>{" "}
            sayfasından takip edebilirsin.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


