import { z } from "zod";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", "."));
  return val;
}, z.number().finite().positive("Tutar 0'dan büyük olmalı."));

export const transactionTypeSchema = z.enum(["income", "expense"]);

export const createTransactionSchema = z.object({
  amount: moneySchema,
  type: transactionTypeSchema,
  category: z
    .string()
    .trim()
    .min(1, "Kategori zorunludur.")
    .max(40, "Kategori en fazla 40 karakter olabilir."),
  /**
   * Date-only string from `<input type="date" />` (YYYY-MM-DD).
   * Stored as UTC timestamp in Supabase.
   */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin."),
});

export type CreateTransactionFormInput = z.input<typeof createTransactionSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const updateMonthlyBudgetGoalSchema = z.object({
  monthlyBudgetGoal: z
    .preprocess((val) => {
      if (val === "" || val == null) return null;
      if (typeof val === "number") return val;
      if (typeof val === "string") return Number(val.replace(",", "."));
      return val;
    }, z.number().finite().positive().nullable())
    .optional(),
});

export type UpdateMonthlyBudgetGoalFormInput = z.input<typeof updateMonthlyBudgetGoalSchema>;
export type UpdateMonthlyBudgetGoalInput = z.infer<typeof updateMonthlyBudgetGoalSchema>;


