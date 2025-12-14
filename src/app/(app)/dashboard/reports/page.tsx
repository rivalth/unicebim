import { AnimatedContainer } from "../animated-container";
import { MonthlyTrendChart } from "@/features/charts/monthly-trend-chart";
import { CategoryPieChart } from "@/features/charts/category-pie-chart";
import { DailyExpenseChart } from "@/features/charts/daily-expense-chart";
import { IncomeExpenseComparisonChart } from "@/features/charts/income-expense-comparison-chart";
import { NetBalanceChart } from "@/features/charts/net-balance-chart";
import { WeeklyComparisonChart } from "@/features/charts/weekly-comparison-chart";
import { normalizeTransactionAmount } from "@/lib/supabase/mappers";
import { createSupabaseServerClient, getCachedUser } from "@/lib/supabase/server";

export default async function DashboardReportsPage() {
  const user = await getCachedUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  // Get last 30 days for daily expense chart
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get weekly comparison data (current week vs previous week)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Sunday
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(currentWeekStart);

  // Get expense breakdown for current month
  const [expenseTotalsResult, dailyExpensesResult, currentWeekTx, previousWeekTx] = await Promise.all([
    supabase.rpc("get_expense_category_totals", {
      p_start: monthStart.toISOString(),
      p_end: monthEnd.toISOString(),
    }),
    supabase
      .from("transactions")
      .select("date, amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .gte("date", thirtyDaysAgo.toISOString())
      .lt("date", monthEnd.toISOString())
      .order("date", { ascending: true }),
    supabase
      .from("transactions")
      .select("date, amount, type")
      .eq("user_id", user.id)
      .gte("date", currentWeekStart.toISOString())
      .lt("date", currentWeekEnd.toISOString()),
    supabase
      .from("transactions")
      .select("date, amount, type")
      .eq("user_id", user.id)
      .gte("date", previousWeekStart.toISOString())
      .lt("date", previousWeekEnd.toISOString()),
  ]);

  // Get monthly summaries for each of the last 6 months for trend chart
  const monthlyTrends = [];
  const incomeExpenseComparison = [];
  const netBalanceData = [];

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
      const income = toFiniteNumber((summaryData[0] as unknown as { income_total?: unknown }).income_total) ?? 0;
      const expense = toFiniteNumber((summaryData[0] as unknown as { expense_total?: unknown }).expense_total) ?? 0;
      const net = toFiniteNumber((summaryData[0] as unknown as { net_total?: unknown }).net_total) ?? 0;
      const monthName = monthStartDate.toLocaleDateString("tr-TR", { month: "short" });

      monthlyTrends.push({
        month: monthName,
        income,
        expense,
        net,
      });

      incomeExpenseComparison.push({
        period: monthName,
        income,
        expense,
      });

      netBalanceData.push({
        period: monthName,
        balance: net,
      });
    }
  }

  // Process daily expense data
  const dailyExpenseMap = new Map<string, number>();
  dailyExpensesResult.data?.forEach((tx) => {
    const dayKey = new Date(tx.date).toISOString().split("T")[0];
    const amount = normalizeTransactionAmount((tx as unknown as { amount?: unknown }).amount);
    dailyExpenseMap.set(dayKey, (dailyExpenseMap.get(dayKey) || 0) + amount);
  });

  const dailyExpenseData = Array.from(dailyExpenseMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Process weekly comparison data (daily breakdown)
  // Group by day of week (0 = Sunday, 6 = Saturday in JS)
  const currentWeekMap = new Map<number, number>();
  currentWeekTx.data?.forEach((tx) => {
    const txDate = new Date(tx.date);
    const dayOfWeek = txDate.getDay(); // 0 (Sunday) to 6 (Saturday)
    const amount = normalizeTransactionAmount((tx as unknown as { amount?: unknown }).amount);
    if (tx.type === "expense") {
      currentWeekMap.set(dayOfWeek, (currentWeekMap.get(dayOfWeek) || 0) + amount);
    }
  });

  const previousWeekMap = new Map<number, number>();
  previousWeekTx.data?.forEach((tx) => {
    const txDate = new Date(tx.date);
    const dayOfWeek = txDate.getDay();
    const amount = normalizeTransactionAmount((tx as unknown as { amount?: unknown }).amount);
    if (tx.type === "expense") {
      previousWeekMap.set(dayOfWeek, (previousWeekMap.get(dayOfWeek) || 0) + amount);
    }
  });

  // Generate week days (Sunday = 0, but we want Monday-first display)
  const weekDayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const weekDayOrder = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
  const weeklyComparisonData = weekDayOrder.map((dayOfWeek, index) => ({
    week: weekDayNames[index],
    current: currentWeekMap.get(dayOfWeek) || 0,
    previous: previousWeekMap.size > 0 ? (previousWeekMap.get(dayOfWeek) || 0) : undefined,
  }));

  // Process category data for pie chart
  const categoryDataRaw = expenseTotalsResult.data || [];
  const COLORS = [
    "#ef4444", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
    "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  ];
  const categoryData = categoryDataRaw.map((item, index) => ({
    category: item.category,
    amount: toFiniteNumber((item as unknown as { total?: unknown }).total) ?? 0,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <AnimatedContainer className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Raporlar</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Görsel analiz ve grafikler</p>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
        <DailyExpenseChart data={dailyExpenseData} />
        <WeeklyComparisonChart data={weeklyComparisonData} />
        <IncomeExpenseComparisonChart data={incomeExpenseComparison} />
        <NetBalanceChart data={netBalanceData} />
      </div>

      <MonthlyTrendChart data={monthlyTrends} />
      <CategoryPieChart data={categoryData} />
    </AnimatedContainer>
  );
}
