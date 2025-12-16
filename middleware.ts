import { type NextRequest, NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

/**
 * Middleware for Next.js App Router.
 * 
 * Responsibilities:
 * - Refreshes Supabase auth session (token refresh if needed)
 * - Protects authenticated routes (requires session)
 * - Redirects authenticated users away from auth pages (login/register)
 * - Redirects unauthenticated users to login for protected routes
 */
export async function middleware(request: NextRequest) {
  // Update Supabase session (refreshes token if needed)
  const response = await updateSupabaseSession(request);

  // Create Supabase client to check auth state
  // Use process.env directly in middleware (edge runtime compatible)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return response without auth check if env vars are missing
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
          // Cookie updates are handled by updateSupabaseSession
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

  return response;
}

/**
 * Middleware matcher configuration.
 * 
 * Matches all routes except:
 * - Static files (_next/static, _next/image, favicon.ico, etc.)
 * - API routes (can handle their own auth)
 * - Public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api routes (can handle auth themselves)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api).*)",
  ],
};

