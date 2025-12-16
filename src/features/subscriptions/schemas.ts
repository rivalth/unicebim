import { z } from "zod";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", "."));
  return val;
}, z.number().finite().positive("Tutar 0'dan büyük olmalı."));

const dateSchema = z.preprocess(
  (val) => {
    if (val instanceof Date) return val.toISOString().split("T")[0];
    if (typeof val === "string") return val;
    return val;
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin (YYYY-MM-DD formatında).")
);

export const createSubscriptionSchema = z.object({
  name: z.string().min(1, "Abonelik adı gereklidir.").max(200, "Abonelik adı çok uzun."),
  amount: moneySchema,
  currency: z.string().min(1, "Para birimi gereklidir.").max(10, "Para birimi çok uzun.").default("TL"),
  billing_cycle: z.enum(["monthly", "yearly"], {
    message: "Faturalama döngüsü 'monthly' veya 'yearly' olmalı.",
  }),
  next_renewal_date: dateSchema,
  icon_url: z.string().url("Geçersiz logo URL'i.").optional().nullable(),
  is_active: z.boolean().default(true),
});

export type CreateSubscriptionFormInput = z.input<typeof createSubscriptionSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  id: z.string().uuid("Geçersiz abonelik ID'si."),
  name: z.string().min(1, "Abonelik adı gereklidir.").max(200, "Abonelik adı çok uzun.").optional(),
  amount: moneySchema.optional(),
  currency: z.string().min(1, "Para birimi gereklidir.").max(10, "Para birimi çok uzun.").optional(),
  billing_cycle: z.enum(["monthly", "yearly"]).optional(),
  next_renewal_date: dateSchema.optional(),
  icon_url: z.string().url("Geçersiz logo URL'i.").optional().nullable(),
  is_active: z.boolean().optional(),
});

export type UpdateSubscriptionFormInput = z.input<typeof updateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export const deleteSubscriptionSchema = z.object({
  id: z.string().uuid("Geçersiz abonelik ID'si."),
});

export type DeleteSubscriptionInput = z.infer<typeof deleteSubscriptionSchema>;

