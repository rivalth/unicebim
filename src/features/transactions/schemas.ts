import { z } from "zod";

import { ALL_CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/features/transactions/categories";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", "."));
  return val;
}, z.number().finite().positive("Tutar 0'dan büyük olmalı."));

export const transactionTypeSchema = z.enum(["income", "expense"]);

export const transactionCategorySchema = z.enum(ALL_CATEGORIES);

export const createTransactionSchema = z
  .object({
    amount: moneySchema,
    type: transactionTypeSchema,
    category: transactionCategorySchema,
    /**
     * Date-only string from `<input type="date" />` (YYYY-MM-DD).
     * Stored as UTC timestamp in Supabase.
     */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin."),
    /**
     * Optional description/note for the transaction.
     * Max length: 500 characters.
     */
    description: z
      .string()
      .max(500, "Açıklama en fazla 500 karakter olabilir.")
      .optional()
      .nullable(),
    /**
     * Optional wallet ID for the transaction.
     */
    wallet_id: z.string().uuid("Geçerli bir cüzdan seçin.").optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const isIncomeCategory = (INCOME_CATEGORIES as readonly string[]).includes(val.category);
    const isExpenseCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(val.category);

    if (val.type === "income" && !isIncomeCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gelir için geçerli bir kategori seçin.",
        path: ["category"],
      });
    }

    if (val.type === "expense" && !isExpenseCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gider için geçerli bir kategori seçin.",
        path: ["category"],
      });
    }
  });

export type CreateTransactionFormInput = z.input<typeof createTransactionSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionIdSchema = z.string().uuid();

export const updateTransactionSchema = z
  .object({
    id: transactionIdSchema,
    amount: moneySchema,
    type: transactionTypeSchema,
    category: transactionCategorySchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin."),
    /**
     * Optional description/note for the transaction.
     * Max length: 500 characters.
     */
    description: z
      .string()
      .max(500, "Açıklama en fazla 500 karakter olabilir.")
      .optional()
      .nullable(),
    /**
     * Optional wallet ID for the transaction.
     */
    wallet_id: z.string().uuid("Geçerli bir cüzdan seçin.").optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const isIncomeCategory = (INCOME_CATEGORIES as readonly string[]).includes(val.category);
    const isExpenseCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(val.category);

    if (val.type === "income" && !isIncomeCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gelir için geçerli bir kategori seçin.",
        path: ["category"],
      });
    }

    if (val.type === "expense" && !isExpenseCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gider için geçerli bir kategori seçin.",
        path: ["category"],
      });
    }
  });

export type UpdateTransactionFormInput = z.input<typeof updateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const deleteTransactionSchema = z.object({
  id: transactionIdSchema,
});

export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;

export const updateMonthlyBudgetGoalSchema = z.object({
  monthlyBudgetGoal: z
    .preprocess((val) => {
      if (val === "" || val == null) return null;
      if (typeof val === "number") return val;
      if (typeof val === "string") return Number(val.replace(",", "."));
      return val;
    }, z.number().finite().positive().nullable())
    .optional(),
  nextIncomeDate: z
    .preprocess((val) => {
      if (val === "" || val == null) return null;
      return val;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin.").nullable())
    .optional(),
  mealPrice: z
    .preprocess((val) => {
      if (val === "" || val == null) return null;
      if (typeof val === "number") return val;
      if (typeof val === "string") return Number(val.replace(",", "."));
      return val;
    }, z.number().finite().positive("Yemek fiyatı 0'dan büyük olmalı.").nullable())
    .optional(),
});

export type UpdateMonthlyBudgetGoalFormInput = z.input<typeof updateMonthlyBudgetGoalSchema>;
export type UpdateMonthlyBudgetGoalInput = z.infer<typeof updateMonthlyBudgetGoalSchema>;


