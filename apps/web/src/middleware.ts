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

  // API requests get a JSON 401 — redirecting them to an HTML login
  // page would just break the client's JSON parse. UI routes get the
  // traditional redirect with `?next` so post-login lands back where
  // the user came from.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

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
    // Admin APIs — gate them too so the cookie check covers reads/writes,
    // not just the UI pages that trigger them. /api/admin/login + logout
    // are excluded so the auth flow itself can hit them pre-auth.
    "/api/members/:path*",
    "/api/design-tasks/:path*",
    "/api/rq-submissions/list",
    // Gate the per-id DELETE but NOT the base /api/rq-submissions
    // endpoint (which the public quiz page POSTs to and needs to
    // reach pre-auth).
    "/api/rq-submissions/:id",
  ],
};
