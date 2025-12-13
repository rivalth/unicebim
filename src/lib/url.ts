/**
 * Prevent open-redirect vulnerabilities by only allowing same-origin, relative paths.
 *
 * Accepts values like:
 * - `/dashboard`
 * - `/dashboard?tab=overview`
 *
 * Rejects:
 * - `https://evil.com`
 * - `//evil.com`
 * - `javascript:...`
 */
export function safeRedirectPath(input: unknown, fallback = "/dashboard"): string {
  if (typeof input !== "string") return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//")) return fallback;
  if (input.includes("://")) return fallback;
  return input;
}


