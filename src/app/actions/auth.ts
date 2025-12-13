"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type LoginInput,
  loginSchema,
  resendConfirmationSchema,
  type RegisterInput,
  registerSchema,
} from "@/features/auth/schemas";

type FieldErrors = Record<string, string[] | undefined>;

export type AuthActionResult =
  | {
      ok: true;
      message?: string;
      redirectTo?: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      redirectTo?: string;
    };

function invalidInputResult(fieldErrors: FieldErrors): AuthActionResult {
  return {
    ok: false,
    message: "Lütfen alanları kontrol edin.",
    fieldErrors,
  };
}

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn("Login failed", { code: error.code, message: error.message });
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        message: "E-posta doğrulaması gerekiyor. Lütfen gelen kutunu kontrol et.",
        redirectTo: `/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`,
      };
    }

    // Avoid account enumeration.
    return { ok: false, message: "E-posta veya parola hatalı." };
  }

  return { ok: true, redirectTo: "/dashboard" };
}

async function resolveSiteUrl(): Promise<string | null> {
  const h = await headers();
  const origin = h.get("origin");
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? null;
}

export async function registerAction(input: RegisterInput): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const siteUrl = await resolveSiteUrl();
  const emailRedirectTo = siteUrl ? `${siteUrl}/auth/callback` : undefined;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  });

  if (error) {
    logger.warn("Register failed", { code: error.code, message: error.message });
    return { ok: false, message: "Kayıt işlemi tamamlanamadı." };
  }

  // If email confirmation is enabled, Supabase returns `session: null`.
  if (!data.session || !data.user) {
    return {
      ok: true,
      message:
        "Kayıt alındı. E-posta doğrulaması gerekiyorsa gelen kutunu kontrol et. Ardından giriş yapabilirsin.",
      redirectTo: `/auth/check-email?email=${encodeURIComponent(parsed.data.email)}`,
    };
  }

  // Best-effort profile bootstrap (requires appropriate RLS).
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      full_name: parsed.data.fullName,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    logger.warn("Profile upsert failed after register", {
      code: profileError.code,
      message: profileError.message,
    });
  }

  return { ok: true, redirectTo: "/dashboard" };
}

export async function resendConfirmationEmailAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const parsed = resendConfirmationSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const siteUrl = await resolveSiteUrl();
  const emailRedirectTo = siteUrl ? `${siteUrl}/auth/callback` : undefined;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });

  if (error) {
    logger.warn("Resend confirmation email failed", {
      code: error.code,
      message: error.message,
    });
    // Avoid account enumeration and keep UX simple.
  }

  return {
    ok: true,
    message:
      "Eğer bu e-posta ile kayıt varsa, doğrulama e-postası tekrar gönderildi. Gelen kutunu ve spam klasörünü kontrol et.",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error("Logout failed", { code: error.code, message: error.message });
  }

  redirect("/");
}


