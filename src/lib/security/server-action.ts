import "server-only";

import { headers } from "next/headers";

import { envPublic } from "@/lib/env/public";
import { getRequestId } from "@/lib/http/request-id";
import { logger } from "@/lib/logger";
import { getExpectedOriginFromHeaders, isSameOriginRequest } from "@/lib/security/csrf";

/**
 * Best-effort CSRF protection for Next.js Server Actions.
 *
 * We validate that the request originates from the same origin as the current deployment.
 * This mitigates cross-site POST attacks (e.g. forced logout).
 */
export async function enforceSameOriginForServerAction(action: string): Promise<
  { ok: true; requestId: string } | { ok: false; requestId: string }
> {
  const h = await headers();
  const requestId = getRequestId(h);

  const expectedOrigin =
    getExpectedOriginFromHeaders(h) ??
    (envPublic.NEXT_PUBLIC_SITE_URL ? new URL(envPublic.NEXT_PUBLIC_SITE_URL).origin : null);

  if (!expectedOrigin || !isSameOriginRequest({ headers: h, expectedOrigin })) {
    logger.warn("csrf.blocked", {
      requestId,
      action,
      origin: h.get("origin"),
      referer: h.get("referer"),
    });
    return { ok: false, requestId };
  }

  return { ok: true, requestId };
}


