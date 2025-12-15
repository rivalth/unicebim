import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(8, "Parola en az 8 karakter olmalı."),
});

export const resendConfirmationSchema = z.object({
  email: z.string().trim().min(1).email(),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Ad soyad en az 2 karakter olmalı.")
      .max(80, "Ad soyad en fazla 80 karakter olabilir."),
    email: z.string().trim().min(1).email(),
    password: z.string().min(8, "Parola en az 8 karakter olmalı."),
    passwordConfirm: z.string().min(8),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "Gizlilik politikası ve kullanım şartlarını kabul etmelisiniz.",
    }),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "Parolalar eşleşmiyor.",
    path: ["passwordConfirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;


