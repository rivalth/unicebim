import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { envPublic } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";
import { safeRedirectPath } from "@/lib/url";

const OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
] as const;

type OtpType = (typeof OTP_TYPES)[number];

function isOtpType(value: string): value is OtpType {
  return (OTP_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeRedirectPath(url.searchParams.get("next"));

  const redirectUrl = new URL("/auth/confirming", url.origin);
  redirectUrl.searchParams.set("next", next);

  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient<Database>(
    envPublic.NEXT_PUBLIC_SUPABASE_URL,
    envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        logger.warn("auth.callback.exchangeCodeForSession failed", {
          code: error.code,
          message: error.message,
        });
      }
      return response;
    }

    if (tokenHash && type && isOtpType(type)) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });

      if (error) {
        logger.warn("auth.callback.verifyOtp failed", { code: error.code, message: error.message });
      }

      return response;
    }
  } catch (err) {
    logger.error("auth.callback unexpected error", { err });
  }

  // Missing/invalid params: still show the confirming page which will guide the user.
  return response;
}


