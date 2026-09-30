import { NextResponse, type NextRequest } from "next/server";

// Lightweight gate: bounce visitors without a session cookie to /login.
// Signature, expiry and role checks happen server-side in requireUser().
export function middleware(req: NextRequest) {
  if (!req.cookies.has("macloans_session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/underwriter/:path*", "/admin/:path*"] };
