import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth proxy (Next.js 16 — formerly middleware.ts).
 *
 * Strategy:
 * - Only protect /dashboard/* routes
 * - If "__session" cookie is absent → redirect to /login
 * - Do NOT redirect /login → /dashboard (let client-side handle that)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get("__session")?.value;
  const isAuthenticated = !!session;

  // Protect /dashboard/* — redirect unauthenticated users to /login
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
