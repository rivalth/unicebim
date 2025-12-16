import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/types";

type HeadersLike = {
  get(name: string): string | null;
};

/**
 * Get a request correlation id.
 * 
 * If the incoming request already has `x-request-id`, we reuse it (bounded length).
 * Otherwise we generate a new UUID using Web Crypto API (available in both Edge and Node.js runtimes).
 */
function getRequestId(headers: HeadersLike): string {
  const MAX_REQUEST_ID_LENGTH = 128;
  const existing = headers.get("x-request-id");
  if (existing && existing.length > 0 && existing.length <= MAX_REQUEST_ID_LENGTH) return existing;
  return crypto.randomUUID();
}

/**
 * Refresh Supabase auth session (if needed) during Next.js Proxy/Middleware execution.
 *
 * Why:
 * - Keeps server-side auth state in sync
 * - Ensures `cookies()`-based Supabase clients see a valid session
 * 
 * Note: This function is compatible with both Edge Runtime (middleware) and Node.js Runtime (proxy).
 * Uses only Web APIs that are available in both runtimes.
 */
export async function updateSupabaseSession(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  const makeRequestHeaders = () => {
    const h = new Headers(request.headers);
    h.set("x-request-id", requestId);
    return h;
  };

  let response = NextResponse.next({
    request: {
      headers: makeRequestHeaders(),
    },
  });
  response.headers.set("x-request-id", requestId);

  // Use process.env directly (available in both Edge and Node.js runtimes)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return response without auth refresh if env vars are missing
    return response;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request: {
              headers: makeRequestHeaders(),
            },
          });
          response.headers.set("x-request-id", requestId);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Triggers token refresh if the session is expired.
  // We intentionally discard the response: cookie updates are handled via `setAll`.
  await supabase.auth.getUser();

  return response;
}


