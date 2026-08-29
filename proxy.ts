import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect all /admin routes
  if (path.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("admin_session");

    // Require a session cookie set by /api/auth/login on successful login
    if (!sessionCookie?.value) {
      // Redirect unauthenticated users to home or login page
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};