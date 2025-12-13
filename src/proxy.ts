import { type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16+ proxy entrypoint (replacement for middleware.ts).
 *
 * Keeps Supabase auth session refreshed so Server Components and Route Handlers
 * see a valid session via `cookies()`.
 */
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - static files in /_next
     * - image optimization files
     * - public assets (common image formats)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


