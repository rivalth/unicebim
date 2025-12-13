import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { envPublic } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";

/**
 * Create a Supabase client for Server Components & Route Handlers.
 *
 * - Reads auth cookies from Next.js' `cookies()`
 * - Attempts to persist refreshed tokens when the runtime allows cookie writes
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    envPublic.NEXT_PUBLIC_SUPABASE_URL,
    envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components have a read-only cookies store.
            // Token refresh is handled in middleware; ignore here.
          }
        },
      },
    },
  );
}


