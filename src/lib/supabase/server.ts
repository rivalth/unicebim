import "server-only";

import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

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

/**
 * Get the current authenticated user (request-scoped cache).
 *
 * Uses React's `cache()` to deduplicate `getUser()` calls within the same request.
 * This prevents duplicate auth checks in Layout and Page components.
 *
 * @returns The authenticated user, or null if not authenticated
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});


