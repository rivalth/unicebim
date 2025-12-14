import "server-only";

export type HeadersLike = {
  get(name: string): string | null;
};

const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Get a request correlation id.
 *
 * If the incoming request already has `x-request-id`, we reuse it (bounded length).
 * Otherwise we generate a new UUID.
 */
export function getRequestId(headers: HeadersLike): string {
  const existing = headers.get("x-request-id");
  if (existing && existing.length > 0 && existing.length <= MAX_REQUEST_ID_LENGTH) return existing;
  return crypto.randomUUID();
}


