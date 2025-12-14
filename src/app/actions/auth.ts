"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { envPublic } from "@/lib/env/public";
import { getExpectedOriginFromHeaders } from "@/lib/security/csrf";
import { checkRateLimit, buildRateLimitKey, getClientIp, rateLimitPolicies } from "@/lib/security/rate-limit";
import { enforceSameOriginForServerAction } from "@/lib/security/server-action";
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
  const originCheck = await enforceSameOriginForServerAction("loginAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "auth.login", ip }),
    policy: rateLimitPolicies["auth.login"],
    requestId: originCheck.requestId,
    context: { action: "loginAction" },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalidInputResult(parsed.error.flatten().fieldErrors);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn("Login failed", { requestId: originCheck.requestId, code: error.code, message: error.message });
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
  
  // Priority 1: Use NEXT_PUBLIC_SITE_URL if set (most reliable for production)
  // This ensures Vercel production deployments use the correct URL even if headers are incorrect
  if (envPublic.NEXT_PUBLIC_SITE_URL) {
    try {
      const siteUrl = new URL(envPublic.NEXT_PUBLIC_SITE_URL);
      logger.info("resolveSiteUrl.using_env", { url: siteUrl.origin });
      return siteUrl.origin;
    } catch {
      // Invalid URL in env, fall through
    }
  }

  // Priority 2: Use forwarded headers (Vercel proxy)
  const forwarded = getExpectedOriginFromHeaders(h);
  if (forwarded && !forwarded.includes("localhost")) {
    logger.info("resolveSiteUrl.using_forwarded", { url: forwarded });
    return forwarded;
  }

  // Priority 3: Use origin header (only if not localhost)
  const origin = h.get("origin");
  if (origin && origin !== "null" && !origin.includes("localhost")) {
    logger.info("resolveSiteUrl.using_origin", { url: origin });
    return origin;
  }

  // Fallback: If we still have NEXT_PUBLIC_SITE_URL but failed to parse above, try direct use
  if (envPublic.NEXT_PUBLIC_SITE_URL) {
    logger.warn("resolveSiteUrl.fallback_to_env_direct", { 
      raw: envPublic.NEXT_PUBLIC_SITE_URL 
    });
    // Return as-is if it looks like an origin (starts with http)
    if (envPublic.NEXT_PUBLIC_SITE_URL.startsWith("http")) {
      return envPublic.NEXT_PUBLIC_SITE_URL;
    }
  }

  logger.warn("resolveSiteUrl.no_url_resolved", {
    hasEnvUrl: !!envPublic.NEXT_PUBLIC_SITE_URL,
    forwarded,
    origin,
  });

  return null;
}

export async function registerAction(input: RegisterInput): Promise<AuthActionResult> {
  const originCheck = await enforceSameOriginForServerAction("registerAction");

  if (!originCheck.ok) {
    // Enhanced error message for debugging
    logger.error("registerAction.csrf_failed", {
      requestId: originCheck.requestId,
      message: "CSRF check failed - check origin headers and NEXT_PUBLIC_SITE_URL",
    });
    return { ok: false, message: "Güvenlik kontrolü başarısız. Lütfen sayfayı yenileyip tekrar deneyin." };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "auth.register", ip }),
    policy: rateLimitPolicies["auth.register"],
    requestId: originCheck.requestId,
    context: { action: "registerAction" },
  });
  if (!rl.ok) return { ok: false, message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin." };

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
    logger.warn("Register failed", { requestId: originCheck.requestId, code: error.code, message: error.message });
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
      requestId: originCheck.requestId,
      code: profileError.code,
      message: profileError.message,
    });
  }

  return { ok: true, redirectTo: "/dashboard" };
}

export async function resendConfirmationEmailAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const originCheck = await enforceSameOriginForServerAction("resendConfirmationEmailAction");
  if (!originCheck.ok) return { ok: false, message: "Geçersiz istek." };

  const h = await headers();
  const ip = getClientIp(h);
  const rl = await checkRateLimit({
    key: buildRateLimitKey({ scope: "auth.resend", ip }),
    policy: rateLimitPolicies["auth.resend"],
    requestId: originCheck.requestId,
    context: { action: "resendConfirmationEmailAction" },
  });
  if (!rl.ok) {
    // Avoid account enumeration; keep messaging generic.
    return {
      ok: true,
      message:
        "Eğer bu e-posta ile kayıt varsa, doğrulama e-postası tekrar gönderildi. Gelen kutunu ve spam klasörünü kontrol et.",
    };
  }

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
      requestId: originCheck.requestId,
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
  const originCheck = await enforceSameOriginForServerAction("logoutAction");
  if (!originCheck.ok) redirect("/");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error("Logout failed", { requestId: originCheck.requestId, code: error.code, message: error.message });
  }

  redirect("/");
}


