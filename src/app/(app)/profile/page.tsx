
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedContainer } from "../dashboard/animated-container";
import { getCachedUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { AvatarUpload } from "@/features/profile/avatar-upload";
import { ProfileForm } from "@/features/profile/profile-form";
import { ChangePasswordForm } from "@/features/profile/change-password-form";
import BudgetSettingsForm from "@/features/profile/budget-settings-form";
import WalletsList from "@/features/wallets/wallets-list";
import AddWalletForm from "@/features/wallets/add-wallet-form";
import { ThemeSelector } from "@/components/theme/theme-selector";

export default async function ProfilePage() {
  const user = await getCachedUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  // Fetch profile data
  // Note: avatar_url may not exist if migration hasn't been run yet
  let profileResult = await supabase
    .from("profiles")
    .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses, meal_price, next_income_date, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // If avatar_url column doesn't exist (code 42703), retry without it
  if (profileResult.error && profileResult.error.code === "42703" && profileResult.error.message.includes("avatar_url")) {
    const retryResult = await supabase
      .from("profiles")
      .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses, meal_price, next_income_date")
      .eq("id", user.id)
      .maybeSingle();
    // Add avatar_url as null if it doesn't exist
    profileResult = {
      ...retryResult,
      data: retryResult.data
        ? ({ ...retryResult.data, avatar_url: null } as typeof retryResult.data & { avatar_url: null })
        : null,
    } as typeof profileResult;
  }

  const [fixedExpensesResult, walletsResult] = await Promise.all([
    supabase
      .from("fixed_expenses")
      .select("id, name, amount")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("wallets")
      .select("id, name, balance, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  const normalizedProfile = mapProfileRow(
    profileResult.data
      ? ({ ...profileResult.data, avatar_url: profileResult.data.avatar_url ?? null } as typeof profileResult.data)
      : null,
  );
  const fixedExpenses = (fixedExpensesResult.data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: typeof e.amount === "number" ? e.amount : Number(e.amount),
  }));

  const wallets: Array<{ id: string; name: string; balance: number; is_default: boolean }> =
    walletsResult.data && Array.isArray(walletsResult.data)
      ? walletsResult.data.map((w) => ({
          id: w.id,
          name: w.name,
          balance: typeof w.balance === "number" ? w.balance : Number(w.balance) || 0,
          is_default: w.is_default,
        }))
      : [];

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Hesap ayarlarını ve tercihlerini yönet</p>
      </div>

      {/* Profile Photo */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Profil Fotoğrafı</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatarUrl={normalizedProfile?.avatar_url ?? null}
            fullName={normalizedProfile?.full_name ?? null}
            userId={user.id}
            size="xl"
          />
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Hesap Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">E-posta</p>
            <p className="text-sm sm:text-base font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              E-posta değişikliği için lütfen Supabase Dashboard&apos;dan iletişime geçin.
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-muted-foreground">Üyelik Tarihi</p>
            <p className="text-sm sm:text-base font-medium">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Belirtilmemiş"}
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Hesap Durumu</p>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              Aktif
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Kişisel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm initialFullName={normalizedProfile?.full_name ?? null} />
        </CardContent>
      </Card>

      {/* Budget Settings */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Bütçe Ayarları</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetSettingsForm
            initialMonthlyBudgetGoal={normalizedProfile?.monthly_budget_goal ?? null}
            initialNextIncomeDate={normalizedProfile?.next_income_date ?? null}
            initialMealPrice={normalizedProfile?.meal_price ?? null}
            fixedExpenses={fixedExpenses}
            monthlyFixedExpenses={normalizedProfile?.monthly_fixed_expenses ?? null}
          />
        </CardContent>
      </Card>

      {/* Wallet Management */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Cüzdan Yönetimi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-4">
            <AddWalletForm />
          </div>
          <WalletsList wallets={wallets} />
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Tema Tercihi</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">Güvenlik</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}
