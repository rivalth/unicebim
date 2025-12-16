import { type NextRequest, NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Proxy for Next.js 16+ App Router.
 * 
 * Replaces the deprecated middleware.ts convention in Next.js 16.
 * Runs on Node.js Runtime (not Edge Runtime).
 * 
 * Note: In Next.js 16, proxy runs on Node.js runtime by default and cannot be configured.
 * If you need Edge Runtime, continue using middleware.ts instead.
 * 
 * Responsibilities:
 * - Refreshes Supabase auth session (token refresh if needed)
 * - Protects authenticated routes (requires session)
 * - Redirects authenticated users away from auth pages (login/register)
 * - Redirects unauthenticated users to login for protected routes
 * 
 * @see https://nextjs.org/docs/app/guides/upgrading/version-16#middleware-to-proxy
 */
export async function proxy(request: NextRequest) {
  // First, update/refresh the session (handles token refresh if needed)
  // This ensures we have the latest session state before making routing decisions
  const response = await updateSupabaseSession(request);

  // Use process.env directly (available in Node.js runtime)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If env vars are missing, return response without auth checks
    return response;
  }

  // Create Supabase client to check auth state
  // Use the refreshed cookies from updateSupabaseSession response
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Cookie updates should be handled via the response object
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Define protected routes (require authentication)
  const protectedRoutes = ["/dashboard", "/transactions", "/reports", "/profile"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Define auth routes (login, register)
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (user && isAuthRoute) {
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is not authenticated and tries to access protected routes, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    // Preserve the intended destination for post-login redirect
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Return the response from updateSupabaseSession (includes refreshed cookies)
  return response;
}

/**
 * Proxy matcher configuration.
 * 
 * Defines which routes the proxy function should handle.
 * Matches all routes except:
 * - Static files (_next/static, _next/image, favicon.ico, etc.)
 * - API routes (can handle their own auth)
 * - Public assets (images, icons, etc.)
 * 
 * Note: The proxy runs on Node.js Runtime (not Edge Runtime) in Next.js 16.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (common image formats)
     * - api routes (can handle auth themselves)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api).*)",
  ],
};

