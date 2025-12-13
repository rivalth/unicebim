export const INCOME_CATEGORIES = ["KYK/Burs", "Aile Harçlığı", "Freelance/Ek İş"] as const;

export const EXPENSE_CATEGORIES = [
  "Sosyal/Keyif",
  "Beslenme",
  "Ulaşım",
  "Sabitler",
  "Okul",
] as const;

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type TransactionCategory = (typeof ALL_CATEGORIES)[number];

export function isIncomeCategory(category: string): category is IncomeCategory {
  return (INCOME_CATEGORIES as readonly string[]).includes(category);
}

export function isExpenseCategory(category: string): category is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(category);
}


