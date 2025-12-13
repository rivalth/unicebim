import { z } from "zod";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", "."));
  return val;
}, z.number().finite().positive("Tutar 0'dan büyük olmalı."));

export const createFixedExpenseSchema = z.object({
  name: z.string().min(1, "Gider adı gereklidir.").max(100, "Gider adı çok uzun."),
  amount: moneySchema,
});

export type CreateFixedExpenseFormInput = z.input<typeof createFixedExpenseSchema>;
export type CreateFixedExpenseInput = z.infer<typeof createFixedExpenseSchema>;

export const updateFixedExpenseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Gider adı gereklidir.").max(100, "Gider adı çok uzun."),
  amount: moneySchema,
});

export type UpdateFixedExpenseFormInput = z.input<typeof updateFixedExpenseSchema>;
export type UpdateFixedExpenseInput = z.infer<typeof updateFixedExpenseSchema>;

export const deleteFixedExpenseSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteFixedExpenseInput = z.infer<typeof deleteFixedExpenseSchema>;

