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

/**
 * Check if the request is a Next.js Server Action.
 * Next.js Server Actions use specific headers/content-type patterns.
 */
function isNextJSServerAction(headers: HeadersLike): boolean {
  // Next.js Server Actions use the `next-action` header or specific content-type
  const nextAction = headers.get("next-action");
  if (nextAction) return true;

  const contentType = headers.get("content-type") ?? "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("text/plain;charset=UTF-8")
  ) {
    // Additional check: Server Actions are POST requests
    const method = headers.get("x-method") ?? headers.get(":method");
    if (method === "POST") return true;
  }

  return false;
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

  // Fallback for environments where Origin/Referer may be absent (e.g., Vercel proxy)
  // sec-fetch-site is controlled by the browser; attackers can't spoof it cross-site.
  const secFetchSite = headers.get("sec-fetch-site");

  // Next.js Server Actions require special handling in proxy environments
  const isServerAction = isNextJSServerAction(headers);

  if (!secFetchSite) {
    // If we have an expected origin and no source origin/referer,
    // and this is likely a Server Action (POST), be more lenient
    // This handles cases where Origin header might be stripped by proxy
    const method = headers.get("x-method") ?? headers.get(":method");
    if ((method === "POST" || isServerAction) && expectedOrigin) {
      // Allow if we're confident about the expected origin (from headers)
      const host = headers.get("x-forwarded-host") ?? headers.get("host");
      if (host) {
        // If host matches expected origin, likely safe
        try {
          const expectedHost = new URL(expectedOrigin).host;
          const expectedHostname = expectedHost.split(":")[0];
          const requestHostname = host.split(":")[0];

          // Exact host match or hostname match (ignoring port)
          if (host === expectedHost || requestHostname === expectedHostname) {
            // For Next.js Server Actions, additional validation via host is sufficient
            if (isServerAction) return true;

            // For regular POST, still require host match (already checked above)
            return true;
          }
        } catch {
          // Invalid URL, continue to strict check
        }
      }
    }
    return false;
  }

  // Standard browser-based CSRF protection
  if (secFetchSite === "same-origin") return true;
  if (allowSameSite && secFetchSite === "same-site") return true;

  return false;
}