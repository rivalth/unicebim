export type SmartBalanceInput = {
  /**
   * Total money available for the month (either from income sum, or a user-provided budget).
   */
  totalMoney: number;
  /**
   * Total expenses recorded for the month (includes fixed + variable).
   */
  expenseTotal: number;
  /**
   * Planned fixed expenses for the month (e.g. rent/subscriptions).
   */
  plannedFixedExpenses: number;
  /**
   * Fixed expenses already paid/recorded for the month.
   */
  fixedExpensesPaid: number;
  now?: Date;
};

export type SmartBalanceResult = {
  remainingDaysInMonth: number;
  currentBalance: number;
  remainingFixedExpenses: number;
  todaySpendableLimit: number;
};

/**
 * Remaining day count for the current month, inclusive.
 *
 * Example (31-day month):
 * - On the 13th => 19 (13..31)
 * - On the 31st => 1
 */
export function getRemainingDaysInMonthUtc(now: Date = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = now.getUTCDate();
  return Math.max(1, lastDay - today + 1);
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Core MVP metric: "Bugün ne kadar yiyebilirim?"
 *
 * Formula:
 *   (Current Balance - Remaining Fixed Expenses) / Remaining Days In Month
 */
export function calculateSmartBalance(input: SmartBalanceInput): SmartBalanceResult {
  const now = input.now ?? new Date();
  // IMPORTANT: Dashboard uses UTC month boundaries for querying transactions.
  // Keep day-remaining calculation in the same calendar (UTC) to avoid cross-month mismatches.
  const remainingDaysInMonth = getRemainingDaysInMonthUtc(now);

  const totalMoney = safeNumber(input.totalMoney);
  const expenseTotal = safeNumber(input.expenseTotal);
  const plannedFixedExpenses = Math.max(0, safeNumber(input.plannedFixedExpenses));
  const fixedExpensesPaid = Math.max(0, safeNumber(input.fixedExpensesPaid));

  const remainingFixedExpenses = Math.max(plannedFixedExpenses - fixedExpensesPaid, 0);
  const currentBalance = totalMoney - expenseTotal;
  const todaySpendableLimit = (currentBalance - remainingFixedExpenses) / remainingDaysInMonth;

  return {
    remainingDaysInMonth,
    currentBalance,
    remainingFixedExpenses,
    todaySpendableLimit,
  };
}


