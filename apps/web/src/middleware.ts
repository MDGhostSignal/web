import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  verifyAdminCookie,
} from "@/lib/admin-auth";

/**
 * Gate internal tooling behind the shared-password auth cookie.
 *
 * Any request to /admin/*, /rq-dashboard/*, or /design-tasks/* that
 * lacks a valid auth cookie gets redirected to /admin/login with
 * `?next=<original-path>` so the login page can send the user back
 * where they came from.
 *
 * /admin/login itself is NOT gated — it's the way in.
 *
 * The matcher config at the bottom limits where this middleware runs
 * so the rest of the site (public marketing pages, API routes not
 * under /api/admin/*) is unaffected.
 */

const PUBLIC_SUBPATHS = ["/admin/login"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Let the login page through unconditionally.
  if (PUBLIC_SUBPATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifyAdminCookie(cookie);
  if (ok) return NextResponse.next();

  // Redirect with the original path as ?next so we can send the user
  // back after they sign in.
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/rq-dashboard/:path*",
    "/design-tasks/:path*",
  ],
};
