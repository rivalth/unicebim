"use client";

import { createBrowserClient } from "@supabase/ssr";

import { envPublic } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";

/**
 * Create a Supabase client for the browser.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    envPublic.NEXT_PUBLIC_SUPABASE_URL,
    envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}


