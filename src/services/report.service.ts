import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapProfileRow, normalizeTransactionAmount } from "@/lib/supabase/mappers";
import { logger } from "@/lib/logger";

export type ReportFilterOptions = {
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  categories?: string[];
  types?: ("income" | "expense")[];
  minAmount?: number;
  maxAmount?: number;
};

export type ReportSectionOptions = {
  includeProfile: boolean;
  includeTransactions: boolean;
  includeWallets: boolean;
  includeFixedExpenses: boolean;
  includeStatistics: boolean;
  includeCategoryBreakdown: boolean;
  includeDailyBreakdown: boolean;
  includeMonthlyTrends: boolean;
};

export type ReportData = {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  profile?: {
    id: string;
    full_name: string | null;
    monthly_budget_goal: number | null;
    monthly_fixed_expenses: number | null;
    meal_price: number | null;
    next_income_date: string | null;
    avatar_url: string | null;
  };
  transactions?: Array<{
    id: string;
    date: string;
    type: "income" | "expense";
    category: string;
    amount: number;
  }>;
  wallets?: Array<{
    id: string;
    name: string;
    balance: number;
    is_default: boolean;
    created_at: string;
  }>;
  fixedExpenses?: Array<{
    id: string;
    name: string;
    amount: number;
    created_at: string;
  }>;
  statistics?: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    transactionCount: number;
    averageTransactionAmount: number;
    largestIncome: number;
    largestExpense: number;
    categoryTotals: Array<{
      category: string;
      total: number;
      count: number;
    }>;
  };
  dailyBreakdown?: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
    transactionCount: number;
  }>;
  monthlyTrends?: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
};

/**
 * Collects comprehensive user data for report generation.
 * Handles all data fetching, aggregation, and formatting.
 */
export async function generateReportData(
  userId: string,
  filters: ReportFilterOptions,
  sections: ReportSectionOptions,
): Promise<ReportData> {
  const supabase = await createSupabaseServerClient();

  const startDate = filters.startDate ? new Date(filters.startDate) : new Date(0); // Beginning of time
  const endDate = filters.endDate
    ? new Date(filters.endDate)
    : new Date(Date.now() + 86400000); // Tomorrow (end of day)

  // Ensure dates are in UTC
  const startUTC = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const endUTC = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  endUTC.setUTCDate(endUTC.getUTCDate() + 1); // End of day

  const reportData: ReportData = {
    generatedAt: new Date().toISOString(),
    period: {
      start: startUTC.toISOString(),
      end: endUTC.toISOString(),
    },
  };

  // Fetch profile data
  if (sections.includeProfile) {
    try {
      const { data: profileRaw, error } = await supabase
        .from("profiles")
        .select("id, full_name, monthly_budget_goal, monthly_fixed_expenses, meal_price, next_income_date, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        logger.warn("Report.profile select failed", { code: error.code, message: error.message });
      } else if (profileRaw) {
        const profile = mapProfileRow(profileRaw);
        if (profile) {
          reportData.profile = {
            id: profile.id,
            full_name: profile.full_name,
            monthly_budget_goal: profile.monthly_budget_goal,
            monthly_fixed_expenses: profile.monthly_fixed_expenses,
            meal_price: profile.meal_price,
            next_income_date: profile.next_income_date ?? null,
            avatar_url: profile.avatar_url ?? null,
          };
        }
      }
    } catch (err) {
      logger.error("Report.profile fetch error", { error: err });
    }
  }

  // Fetch all transactions with filters
  if (sections.includeTransactions || sections.includeStatistics || sections.includeDailyBreakdown) {
    try {
      let query = supabase
        .from("transactions")
        .select("id, date, type, category, amount")
        .eq("user_id", userId)
        .gte("date", startUTC.toISOString())
        .lt("date", endUTC.toISOString())
        .order("date", { ascending: false })
        .order("id", { ascending: false });

      // Apply filters
      if (filters.categories && filters.categories.length > 0) {
        query = query.in("category", filters.categories);
      }
      if (filters.types && filters.types.length > 0) {
        query = query.in("type", filters.types);
      }

      const { data: transactionsRaw, error } = await query;

      if (error) {
        logger.warn("Report.transactions select failed", { code: error.code, message: error.message });
      } else if (transactionsRaw) {
        let transactions = transactionsRaw.map((tx) => ({
          id: tx.id,
          date: tx.date,
          type: tx.type,
          category: tx.category,
          amount: normalizeTransactionAmount((tx as unknown as { amount?: unknown }).amount),
        }));

        // Apply amount filters
        if (filters.minAmount !== undefined) {
          transactions = transactions.filter((t) => t.amount >= filters.minAmount!);
        }
        if (filters.maxAmount !== undefined) {
          transactions = transactions.filter((t) => t.amount <= filters.maxAmount!);
        }

        if (sections.includeTransactions) {
          reportData.transactions = transactions;
        }

        // Calculate statistics
        if (sections.includeStatistics) {
          const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
          const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
          const netBalance = totalIncome - totalExpense;
          const transactionCount = transactions.length;
          const averageTransactionAmount =
            transactionCount > 0
              ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactionCount
              : 0;
          const incomeTransactions = transactions.filter((t) => t.type === "income");
          const expenseTransactions = transactions.filter((t) => t.type === "expense");
          const largestIncome = incomeTransactions.length > 0 ? Math.max(...incomeTransactions.map((t) => t.amount)) : 0;
          const largestExpense =
            expenseTransactions.length > 0 ? Math.max(...expenseTransactions.map((t) => t.amount)) : 0;

          // Category totals
          const categoryMap = new Map<string, { total: number; count: number }>();
          transactions.forEach((t) => {
            const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
            categoryMap.set(t.category, {
              total: existing.total + t.amount,
              count: existing.count + 1,
            });
          });

          const categoryTotals = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            total: data.total,
            count: data.count,
          }));

          reportData.statistics = {
            totalIncome,
            totalExpense,
            netBalance,
            transactionCount,
            averageTransactionAmount,
            largestIncome,
            largestExpense,
            categoryTotals: categoryTotals.sort((a, b) => b.total - a.total),
          };
        }

        // Daily breakdown
        if (sections.includeDailyBreakdown) {
          const dailyMap = new Map<string, { income: number; expense: number; count: number }>();
          transactions.forEach((t) => {
            const dayKey = new Date(t.date).toISOString().split("T")[0];
            const existing = dailyMap.get(dayKey) || { income: 0, expense: 0, count: 0 };
            if (t.type === "income") {
              existing.income += t.amount;
            } else {
              existing.expense += t.amount;
            }
            existing.count += 1;
            dailyMap.set(dayKey, existing);
          });

          reportData.dailyBreakdown = Array.from(dailyMap.entries())
            .map(([date, data]) => ({
              date,
              income: data.income,
              expense: data.expense,
              net: data.income - data.expense,
              transactionCount: data.count,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }

        // Monthly trends (if period spans multiple months)
        if (sections.includeMonthlyTrends) {
          const monthMap = new Map<
            string,
            { month: string; income: number; expense: number; net: number }
          >();
          transactions.forEach((t) => {
            const date = new Date(t.date);
            const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
            const monthName = date.toLocaleDateString("tr-TR", { month: "short", year: "numeric" });
            const existing = monthMap.get(monthKey) || { month: monthName, income: 0, expense: 0, net: 0 };
            if (t.type === "income") {
              existing.income += t.amount;
            } else {
              existing.expense += t.amount;
            }
            existing.net = existing.income - existing.expense;
            monthMap.set(monthKey, existing);
          });

          reportData.monthlyTrends = Array.from(monthMap.values()).sort((a, b) =>
            a.month.localeCompare(b.month),
          );
        }
      }
    } catch (err) {
      logger.error("Report.transactions fetch error", { error: err });
    }
  }

  // Fetch wallets
  if (sections.includeWallets) {
    try {
      const { data: walletsRaw, error } = await supabase
        .from("wallets")
        .select("id, name, balance, is_default, created_at")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        logger.warn("Report.wallets select failed", { code: error.code, message: error.message });
      } else if (walletsRaw) {
        reportData.wallets = walletsRaw.map((w) => ({
          id: w.id,
          name: w.name,
          balance: typeof w.balance === "number" ? w.balance : Number(w.balance) || 0,
          is_default: w.is_default,
          created_at: w.created_at,
        }));
      }
    } catch (err) {
      logger.error("Report.wallets fetch error", { error: err });
    }
  }

  // Fetch fixed expenses
  if (sections.includeFixedExpenses) {
    try {
      const { data: fixedExpensesRaw, error } = await supabase
        .from("fixed_expenses")
        .select("id, name, amount, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.warn("Report.fixed_expenses select failed", { code: error.code, message: error.message });
      } else if (fixedExpensesRaw) {
        reportData.fixedExpenses = fixedExpensesRaw.map((fe) => ({
          id: fe.id,
          name: fe.name,
          amount: typeof fe.amount === "number" ? fe.amount : Number(fe.amount) || 0,
          created_at: fe.created_at,
        }));
      }
    } catch (err) {
      logger.error("Report.fixed_expenses fetch error", { error: err });
    }
  }

  // Category breakdown (separate from statistics for detailed view)
  if (sections.includeCategoryBreakdown && reportData.statistics) {
    // Already included in statistics.categoryTotals
    // This flag can be used to show/hide detailed breakdown in UI
  }

  return reportData;
}
