import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { envPublic } from "@/lib/env/public";
import { getRequestId } from "@/lib/http/request-id";
import type { Database } from "@/lib/supabase/types";

/**
 * Refresh Supabase auth session (if needed) during Next.js Middleware execution.
 *
 * Why:
 * - Keeps server-side auth state in sync
 * - Ensures `cookies()`-based Supabase clients see a valid session
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

  const supabase = createServerClient<Database>(
    envPublic.NEXT_PUBLIC_SUPABASE_URL,
    envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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


