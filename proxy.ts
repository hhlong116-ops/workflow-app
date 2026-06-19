import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

const AUTH_TIMEOUT_MS = 2500;

export async function proxy(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const { key, url } = getSupabaseConfig();

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const authResult = await Promise.race([
    supabase.auth.getUser().catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
  ]);
  const user = authResult?.data.user ?? null;

  // Protected routes - redirect to login if not authenticated
  const protectedRoutes = ["/dashboard", "/projects"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    requestUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login/signup
  if ((requestUrl.pathname === "/login" || requestUrl.pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect root to dashboard if authenticated, login if not
  if (requestUrl.pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next (Next.js internals)
     * - favicon.ico (favicon file)
     */
    "/((?!_next|favicon.ico).*)",
  ],
};
