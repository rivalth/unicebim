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
 *
 * @param input - Raw redirect path from user input (query param, etc.)
 * @param fallback - Default path to use if input is invalid (default: "/dashboard")
 * @param onInvalid - Optional callback when invalid redirect is detected (for telemetry)
 * @returns Safe redirect path (either validated input or fallback)
 */
export function safeRedirectPath(
  input: unknown,
  fallback = "/dashboard",
  onInvalid?: (rejected: string) => void,
): string {
  if (typeof input !== "string") {
    if (onInvalid && typeof input === "string") {
      onInvalid(input);
    }
    return fallback;
  }

  const isValid =
    input.startsWith("/") && !input.startsWith("//") && !input.includes("://");

  if (!isValid) {
    onInvalid?.(input);
    return fallback;
  }

  return input;
}


