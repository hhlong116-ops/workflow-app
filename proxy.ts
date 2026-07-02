import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const requestUrl = new URL(request.url);

  // Temporary public demo mode: skip auth checks and send entry/auth pages to the dashboard.
  if (
    requestUrl.pathname === "/" ||
    requestUrl.pathname === "/login" ||
    requestUrl.pathname === "/signup"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
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
