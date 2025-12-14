import "server-only";

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  // Node supports base64url; keep this helper explicit for clarity.
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Create a weak ETag from a string payload.
 *
 * We use SHA-256 to keep it short and stable.
 */
export async function createWeakEtag(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return `W/"${toBase64Url(digest)}"`;
}


