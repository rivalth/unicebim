export const INCOME_CATEGORIES = ["KYK/Burs", "Aile Harçlığı", "Freelance/Ek İş", "Diğer"] as const;

export const EXPENSE_CATEGORIES = [
  "Sosyal/Keyif",
  "Beslenme",
  "Ulaşım",
  "Sabitler",
  "Okul",
  "Diğer",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type TransactionCategory = IncomeCategory | ExpenseCategory;

// Combine categories and remove duplicates (e.g., "Diğer" appears in both income and expense)
export const ALL_CATEGORIES: readonly TransactionCategory[] = Array.from(
  new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
) as readonly TransactionCategory[];

export function isIncomeCategory(category: string): category is IncomeCategory {
  return (INCOME_CATEGORIES as readonly string[]).includes(category);
}

export function isExpenseCategory(category: string): category is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(category);
}


