import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isLoggedIn = !!session;
  const isPortalRoute = nextUrl.pathname.startsWith("/portal");
  const isAuthRoute = nextUrl.pathname.startsWith("/auth");

  // Protect portal routes
  if (isPortalRoute && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/portal", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/portal/:path*",
    "/auth/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).)*",
  ],
};
