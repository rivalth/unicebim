import { z } from "zod";

const moneySchema = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(",", "."));
  return val;
}, z.number().finite().nonnegative("Bakiye negatif olamaz."));

export const createWalletSchema = z.object({
  name: z.string().min(1, "Cüzdan adı gerekli.").max(50, "Cüzdan adı çok uzun."),
  balance: moneySchema,
  isDefault: z.boolean().optional(),
});

export type CreateWalletFormInput = z.input<typeof createWalletSchema>;
export type CreateWalletInput = z.infer<typeof createWalletSchema>;

export const updateWalletSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Cüzdan adı gerekli.").max(50, "Cüzdan adı çok uzun.").optional(),
  balance: moneySchema.optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateWalletFormInput = z.input<typeof updateWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;

export const deleteWalletSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteWalletInput = z.infer<typeof deleteWalletSchema>;

export const transferBetweenWalletsSchema = z.object({
  fromWalletId: z.string().uuid(),
  toWalletId: z.string().uuid(),
  amount: moneySchema.refine((val) => val > 0, "Transfer tutarı 0'dan büyük olmalı."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin."),
});

export type TransferBetweenWalletsFormInput = z.input<typeof transferBetweenWalletsSchema>;
export type TransferBetweenWalletsInput = z.infer<typeof transferBetweenWalletsSchema>;
