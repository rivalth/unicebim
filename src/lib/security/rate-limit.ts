import "server-only";

import type { HeadersLike } from "@/lib/http/request-id";
import { tooManyRequests } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import { isMissingRpcFunctionError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitScope =
  | "auth.login"
  | "auth.register"
  | "auth.resend"
  | "tx.write"
  | "profile.write"
  | "fixed_expenses.write";

export const rateLimitPolicies: Record<RateLimitScope, RateLimitPolicy> = {
  "auth.login": { limit: 10, windowSeconds: 60 },
  "auth.register": { limit: 5, windowSeconds: 60 * 10 },
  "auth.resend": { limit: 5, windowSeconds: 60 * 10 },
  "tx.write": { limit: 60, windowSeconds: 60 },
  "profile.write": { limit: 20, windowSeconds: 60 },
  "fixed_expenses.write": { limit: 30, windowSeconds: 60 },
};

let warnedMissingRateLimitRpc = false;

export function getClientIp(headers: HeadersLike): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim() || null;

  return null;
}

export function buildRateLimitKey({
  scope,
  ip,
  userId,
}: {
  scope: RateLimitScope;
  ip: string | null;
  userId?: string | null;
}): string {
  // Keep keys predictable, low-cardinality, and non-secret.
  const parts = [
    "unicebim",
    "rl",
    scope,
    userId ? `u:${userId}` : null,
    ip ? `ip:${ip}` : null,
  ].filter(Boolean);

  // Postgres text key; keep reasonably small.
  return parts.join("|").slice(0, 200);
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export async function checkRateLimit({
  key,
  policy,
  requestId,
  context,
}: {
  key: string;
  policy: RateLimitPolicy;
  requestId: string;
  context: Record<string, unknown>;
}): Promise<RateLimitResult> {
  const supabase = await createSupabaseServerClient();

  // Supabase JS's RPC typing can be fragile when Database types are hand-written.
  // Keep this boundary explicit and resilient.
  const res = (await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: policy.limit,
    p_window_seconds: policy.windowSeconds,
  })) as {
    data: boolean | null;
    error: { code?: string; message?: string } | null;
  };
  const { data, error } = res;

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      if (!warnedMissingRateLimitRpc) {
        warnedMissingRateLimitRpc = true;
        logger.warn("rate_limit.rpc_missing (fail-open)", {
          requestId,
          message: error.message,
        });
      }
      return { ok: true };
    }

    // Fail-open: do not block product functionality due to RL infra issues.
    logger.error("rate_limit.check failed (fail-open)", {
      requestId,
      code: error.code,
      message: error.message,
      ...context,
    });
    return { ok: true };
  }

  if (data === false) {
    logger.warn("rate_limit.blocked", { requestId, key, ...context });
    return { ok: false, retryAfterSeconds: policy.windowSeconds };
  }

  return { ok: true };
}

export async function enforceRateLimit({
  key,
  policy,
  requestId,
  context,
}: {
  key: string;
  policy: RateLimitPolicy;
  requestId: string;
  context: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; response: Response }> {
  const result = await checkRateLimit({ key, policy, requestId, context });
  if (result.ok) return { ok: true };
  return { ok: false, response: tooManyRequests(requestId, result.retryAfterSeconds) };
}


