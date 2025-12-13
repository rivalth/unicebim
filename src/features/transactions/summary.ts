import type { TransactionType } from "@/features/transactions/schemas";

export type TransactionLike = {
  amount: number;
  type: TransactionType;
};

export type MonthlySummary = {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
};

/**
 * Calculate monthly totals for a list of transactions.
 * Pure & unit-testable (no I/O).
 */
export function calculateMonthlySummary(transactions: TransactionLike[]): MonthlySummary {
  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const t of transactions) {
    const amount = Number.isFinite(t.amount) ? t.amount : 0;
    if (t.type === "income") incomeTotal += amount;
    else expenseTotal += amount;
  }

  return {
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
  };
}


