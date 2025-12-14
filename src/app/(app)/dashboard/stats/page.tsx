import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedContainer } from "../animated-container";
import { logger } from "@/lib/logger";
import { formatTRY } from "@/lib/money";
import { toFiniteNumber } from "@/lib/number";
import { mapProfileRow } from "@/lib/supabase/mappers";
import { isMissingRpcFunctionError } from "@/lib/supabase/errors";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";

export default async function DashboardStatsPage() {
  const user = await getCachedUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  // Get last 6 months for trend analysis
  const sixMonthsAgo = new Date(monthStart);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [profileResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses, meal_price, next_income_date, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const { data: profile } = profileResult;
  const normalizedProfile = mapProfileRow(profile);
  const displayName = normalizedProfile?.full_name ?? null;

  // Get monthly summaries for each of the last 6 months
  const monthlyTrends = [];
  for (let i = 5; i >= 0; i--) {
    const monthStartDate = new Date(monthStart);
    monthStartDate.setMonth(monthStartDate.getMonth() - i);
    const monthEndDate = new Date(monthStartDate);
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);

    const { data: summaryData } = await supabase.rpc("get_monthly_summary", {
      p_start: monthStartDate.toISOString(),
      p_end: monthEndDate.toISOString(),
    });

    if (summaryData && summaryData[0]) {
      const monthData = summaryData[0];
      monthlyTrends.push({
        month: monthStartDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        income_total: toFiniteNumber((monthData as unknown as { income_total?: unknown }).income_total) ?? 0,
        expense_total: toFiniteNumber((monthData as unknown as { expense_total?: unknown }).expense_total) ?? 0,
        net_total: toFiniteNumber((monthData as unknown as { net_total?: unknown }).net_total) ?? 0,
      });
    }
  }

  const currentMonth = monthlyTrends[monthlyTrends.length - 1];
  const currentIncome = currentMonth?.income_total ?? 0;
  const currentExpense = currentMonth?.expense_total ?? 0;
  const currentNet = currentMonth?.net_total ?? 0;

  // Calculate averages
  const avgIncome =
    monthlyTrends.length > 0
      ? monthlyTrends.reduce((sum, m) => sum + m.income_total, 0) / monthlyTrends.length
      : 0;
  const avgExpense =
    monthlyTrends.length > 0
      ? monthlyTrends.reduce((sum, m) => sum + m.expense_total, 0) / monthlyTrends.length
      : 0;

  // Calculate month-over-month change
  const prevMonth = monthlyTrends.length >= 2 ? monthlyTrends[monthlyTrends.length - 2] : null;
  const prevExpense = prevMonth?.expense_total ?? 0;
  const expenseChange = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0;

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">İstatistikler</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Detaylı finansal analiz ve trend verileri</p>
      </div>

      {/* Current Month Overview */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Bu Ay Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold">{formatTRY(currentIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ortalama: {formatTRY(avgIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Bu Ay Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold">{formatTRY(currentExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseChange !== 0 && (
                <span className={expenseChange > 0 ? "text-destructive" : "text-emerald-600"}>
                  {expenseChange > 0 ? "+" : ""}
                  {expenseChange.toFixed(1)}% geçen aya göre
                </span>
              )}
              {expenseChange === 0 && "Ortalama: " + formatTRY(avgExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Net Bakiye</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-semibold ${currentNet >= 0 ? "text-emerald-600" : "text-destructive"}`}
            >
              {formatTRY(currentNet)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {normalizedProfile?.monthly_budget_goal
                ? `Hedef: ${formatTRY(normalizedProfile.monthly_budget_goal)}`
                : "Hedef belirlenmemiş"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg">6 Aylık Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrends.length > 0 ? (
            <div className="space-y-4">
              {monthlyTrends.map((monthData, index) => {
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{monthData.month}</span>
                      <span
                        className={`font-semibold ${monthData.net_total >= 0 ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {formatTRY(monthData.net_total)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Gelir: </span>
                        <span className="font-medium">{formatTRY(monthData.income_total)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gider: </span>
                        <span className="font-medium">{formatTRY(monthData.expense_total)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Henüz yeterli veri yok.</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Statistics */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Ortalama Aylık Gelir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold">{formatTRY(avgIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Son {monthlyTrends.length} ayın ortalaması
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Ortalama Aylık Gider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-semibold">{formatTRY(avgExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Son {monthlyTrends.length} ayın ortalaması
            </p>
          </CardContent>
        </Card>
      </div>
    </AnimatedContainer>
  );
}
