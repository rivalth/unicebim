/**
 * Brand Icon Fetcher
 *
 * Fetches brand logos using unavatar.io API.
 * Falls back to a default icon if the brand is not found.
 */

const UNAVATAR_BASE_URL = "https://unavatar.io";

/**
 * Popular subscription services for smart detection
 */
export const POPULAR_SUBSCRIPTION_SERVICES = [
  "netflix",
  "spotify",
  "exxen",
  "youtube",
  "amazon",
  "blutv",
  "disney",
  "apple",
  "microsoft",
  "adobe",
  "github",
  "notion",
  "figma",
  "dropbox",
  "google",
] as const;

export type PopularSubscriptionService = (typeof POPULAR_SUBSCRIPTION_SERVICES)[number];

/**
 * Normalizes a brand name to a domain-like format for unavatar.io
 * Examples:
 * - "Netflix" -> "netflix.com"
 * - "Spotify Premium" -> "spotify.com"
 * - "YouTube Premium" -> "youtube.com"
 */
function normalizeBrandName(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s+(premium|pro|plus|subscription|abonelik)$/i, "")
    // Remove special characters except spaces and hyphens
    .replace(/[^a-z0-9\s-]/g, "")
    // Replace spaces with nothing (for domain format)
    .replace(/\s+/g, "");

  // Check if it's a known popular service
  const matchedService = POPULAR_SUBSCRIPTION_SERVICES.find((service) =>
    normalized.includes(service)
  );

  if (matchedService) {
    return `${matchedService}.com`;
  }

  // If no match, try appending .com
  return `${normalized}.com`;
}

/**
 * Fetches a brand icon URL from unavatar.io
 *
 * @param query - Brand name (e.g., "Netflix", "Spotify")
 * @returns Promise resolving to icon URL or null if not found
 */
export async function getBrandIcon(query: string): Promise<string | null> {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return null;
  }

  try {
    const domain = normalizeBrandName(query);
    // Direct image URL - unavatar.io will return an image
    // We'll return the URL and let the img tag's onError handle failures
    const imageUrl = `${UNAVATAR_BASE_URL}/${domain}`;
    
    // Return URL immediately - img tag will handle loading and errors
    // This is more reliable than trying to pre-validate with fetch
    return imageUrl;
  } catch (error) {
    // Network errors, timeouts, etc. - return null silently
    if (error instanceof Error && error.name === "AbortError") {
      // Timeout - return null
      return null;
    }

    // Other errors - log in development, return null in production
    if (process.env.NODE_ENV === "development") {
      console.warn(`Failed to fetch brand icon for "${query}":`, error);
    }

    return null;
  }
}

/**
 * Checks if a description text contains a popular subscription service name
 *
 * @param description - Transaction description text
 * @returns The matched service name or null
 */
export function detectSubscriptionService(description: string | null | undefined): string | null {
  if (!description || typeof description !== "string") {
    return null;
  }

  const normalized = description.toLowerCase().trim();

  for (const service of POPULAR_SUBSCRIPTION_SERVICES) {
    if (normalized.includes(service)) {
      return service;
    }
  }

  return null;
}

