import { z } from "zod";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", "."));
  return val;
}, z.number().finite().positive("Tutar 0'dan büyük olmalı."));

const dateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") return val;
  return val;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin (YYYY-MM-DD)."));

export const createPaymentSchema = z.object({
  name: z.string().min(1, "Ödeme adı gereklidir.").max(200, "Ödeme adı çok uzun."),
  amount: moneySchema,
  due_date: dateSchema.refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today;
    },
    { message: "Vade tarihi bugünden önce olamaz." }
  ),
});

export type CreatePaymentFormInput = z.input<typeof createPaymentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Ödeme adı gereklidir.").max(200, "Ödeme adı çok uzun."),
  amount: moneySchema,
  due_date: dateSchema,
  is_paid: z.boolean().optional(),
});

export type UpdatePaymentFormInput = z.input<typeof updatePaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const deletePaymentSchema = z.object({
  id: z.string().uuid(),
});

export type DeletePaymentInput = z.infer<typeof deletePaymentSchema>;

export const markPaymentPaidSchema = z.object({
  id: z.string().uuid(),
  is_paid: z.boolean(),
});

export type MarkPaymentPaidInput = z.infer<typeof markPaymentPaidSchema>;

