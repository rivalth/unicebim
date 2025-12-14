import "server-only";

import type { HeadersLike } from "@/lib/http/request-id";

function tryParseOrigin(value: string): string | null {
  // `Origin` is already an origin string; `Referer` is a full URL.
  // Both are parseable by URL() when well-formed.
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getSourceOrigin(headers: HeadersLike): string | null {
  const origin = headers.get("origin");
  if (origin && origin !== "null") return tryParseOrigin(origin);

  const referer = headers.get("referer");
  if (referer) return tryParseOrigin(referer);

  return null;
}

/**
 * Compute expected origin using proxy headers (Vercel-friendly).
 *
 * Returns e.g. `https://example.com` when `x-forwarded-proto` and `x-forwarded-host` exist.
 */
export function getExpectedOriginFromHeaders(headers: HeadersLike): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? null;
  if (!host) return null;

  const forwardedProto = headers.get("x-forwarded-proto");
  const proto =
    forwardedProto ??
    // Local dev commonly lacks x-forwarded-proto; default safely.
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export function isSameOriginRequest({
  headers,
  expectedOrigin,
  allowedOrigins = [],
  allowSameSite = true,
}: {
  headers: HeadersLike;
  expectedOrigin: string;
  allowedOrigins?: string[];
  allowSameSite?: boolean;
}): boolean {
  const sourceOrigin = getSourceOrigin(headers);
  const allowed = new Set([expectedOrigin, ...allowedOrigins]);

  if (sourceOrigin) {
    return allowed.has(sourceOrigin);
  }

  // Fallback for environments where Origin/Referer may be absent.
  // sec-fetch-site is controlled by the browser; attackers can't spoof it cross-site.
  const secFetchSite = headers.get("sec-fetch-site");
  if (!secFetchSite) return false;

  if (secFetchSite === "same-origin") return true;
  if (allowSameSite && secFetchSite === "same-site") return true;

  return false;
}


