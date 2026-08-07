import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  verifyAdminCookie,
} from "@/lib/admin-auth";
import { createStudioServerClient } from "@/lib/studio-auth";
import { STUDIO_INVITE_ONLY } from "@/lib/studio-lite";

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
 * The matcher config at the bottom limits where this proxy runs so
 * the rest of the site (public marketing pages, API routes not under
 * the admin umbrella) is unaffected.
 *
 * File convention note: Next.js 16 renamed `middleware.ts` → `proxy.ts`
 * and the exported function from `middleware` → `proxy`. Same runtime
 * behaviour; the rename clarifies what the feature actually does (a
 * network-boundary proxy in front of the app) and avoids the overloaded
 * "middleware" terminology. See:
 * https://nextjs.org/docs/messages/middleware-to-proxy
 */

const PUBLIC_SUBPATHS = [
  "/admin/login",
  // Vercel Cron hits the Mercury sync endpoint with a Bearer token, not
  // the admin cookie. We let the path through here and enforce the
  // bearer-token check inside the route handler itself. The "Refresh
  // now" UI button still works because the route accepts either auth
  // path. See apps/web/src/app/api/admin/finance/sync/route.ts.
  "/api/admin/finance/sync",
  // Same pattern for the daily social-post digest cron. The route
  // accepts the CRON_SECRET bearer OR the admin cookie (manual
  // "Send digest now" trigger from the UI).
  "/api/admin/marketing-social/digest",
  // esignatures.com webhook — they POST event updates here with an
  // X-Signature-SHA256 header. The route enforces HMAC verification
  // internally; no admin cookie, no CRON_SECRET.
  "/api/admin/contracts/webhook",
  // CRM alerts sync runs hourly from GitHub Actions with the
  // CRON_SECRET bearer. The route also accepts the admin cookie so the
  // in-app "Refresh alerts now" button can hit it. Same pattern as
  // /api/admin/finance/sync.
  "/api/admin/alerts/sync",
  // Daily alert digest cron — sends one grouped email per owner each
  // morning. Same auth path: Bearer CRON_SECRET or admin cookie.
  "/api/admin/alerts/digest",
  // Hourly campaign-ending detection cron — inserts the in-app alert and
  // sends the one-time email when a campaign hits 97% run time. Bearer
  // CRON_SECRET or admin cookie.
  "/api/admin/campaign-alerts/sync",
  // ART19 → Supabase sync — runs daily from GitHub Actions with the
  // CRON_SECRET bearer. Route also accepts the admin cookie so the
  // in-app "Refresh now" button (Phase B) can hit it.
  "/api/admin/art19/sync",
];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // === Studio surface (per-user Supabase Auth) ===========================
  // /studio (the root landing page), /studio/login, and /studio/register
  // are unauthenticated — the root serves a public marketing landing for
  // visitors who hit the workspace cold, and the page itself decides
  // whether to render the landing or the dashboard based on the member
  // session. Everything else under /studio/* requires a Supabase session.
  // Approved (member row has activated_at IS NOT NULL) users see the
  // surface; pending users get the "waiting for approval" holding page.
  // While STUDIO_INVITE_ONLY is on, /studio/register loses its public
  // exemption unless the URL carries an ?invite= token from the team's
  // invite email — the proxy only checks presence; the page verifies
  // the signature server-side and bounces bad tokens to /studio/login.
  if (pathname.startsWith("/studio")) {
    if (
      pathname === "/studio" ||
      pathname === "/studio/login" ||
      (pathname === "/studio/register" &&
        (!STUDIO_INVITE_ONLY || req.nextUrl.searchParams.has("invite")))
    ) {
      return NextResponse.next();
    }
    const supabase = await createStudioServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/studio/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
    // /studio/pending is allowed once authed; the page itself
    // redirects approved users back to /studio.
    return NextResponse.next();
  }

  // === HQ + legacy admin gates (shared-password cookie) ==================
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
    // Nav V2 preview shell — same shared-password gate as /admin/*.
    // Temporary route; remove alongside src/app/admin2/ once the team
    // picks a nav order.
    "/admin2",
    // Studio — client-facing brand/creator surface with per-user
    // Supabase Auth (distinct from the admin shared-cookie gate).
    "/studio/:path*",
    "/rq-dashboard/:path*",
    "/design-tasks/:path*",
    // Admin APIs — gate them too so the cookie check covers reads/writes,
    // not just the UI pages that trigger them. /api/admin/login + logout
    // are excluded so the auth flow itself can hit them pre-auth.
    "/api/members/:path*",
    "/api/design-tasks/:path*",
    "/api/rq-submissions/list",
    // Finance read endpoints — sync POST is allowlisted in
    // PUBLIC_SUBPATHS above so Vercel Cron can reach it.
    "/api/admin/finance/accounts",
    "/api/admin/finance/transactions",
    "/api/admin/finance/trend",
    // Marketing Asset Library — list, item, files, and any sub-route.
    "/api/admin/marketing-assets/:path*",
    // Marketing Copy Library — list, item, and any sub-route.
    "/api/admin/marketing-copy/:path*",
    // Marketing Social Scheduler — list, item, images. The digest
    // endpoint under this prefix is allowlisted in PUBLIC_SUBPATHS
    // above so Vercel Cron can reach it.
    "/api/admin/marketing-social/:path*",
    // Contracts (esignatures.com integration). The /webhook sub-path
    // is allowlisted in PUBLIC_SUBPATHS so esignatures.com can POST
    // events without an admin cookie.
    "/api/admin/contracts/:path*",
    // Notebook — plain-text scratch docs (Business plan / Notes).
    "/api/admin/notebook",
    // Members lite-lookup (used by the contracts dashboard + the Phase C
    // composer to hydrate member labels / search-pick a counterparty).
    "/api/admin/members/:path*",
    // CRM alerts — list / count / per-id snooze + resolve. /sync and
    // /digest are allowlisted in PUBLIC_SUBPATHS so the GitHub Actions
    // cron can hit them; everything else flows through the cookie gate.
    "/api/admin/alerts",
    "/api/admin/alerts/count",
    "/api/admin/alerts/:id",
    // Studio approval — admin co-founders flip activated_at to grant
    // access. Cookie-gated like the rest of /api/admin/*.
    "/api/admin/studio/:path*",
    // Cold-email outreach (list, send, preview) — Mike's brand
    // prospecting tab. Cookie-gated; sends go through Resend.
    "/api/admin/outreach/:path*",
    // ART19 read endpoints — /sync is allowlisted above; reads are
    // cookie-gated so only signed-in admins can see show/episode data.
    "/api/admin/art19/summary",
    "/api/admin/art19/shows",
    "/api/admin/art19/episodes",
    "/api/admin/art19/listens",
    "/api/admin/art19/campaigns",
    // Gate the per-id DELETE but NOT the base /api/rq-submissions
    // endpoint (which the public quiz page POSTs to and needs to
    // reach pre-auth).
    "/api/rq-submissions/:id",
    // XQ — same shape as RQ: admin gates the list + per-id delete,
    // the base POST stays public so the /xq-quiz page can submit
    // pre-auth.
    "/api/xq-submissions/list",
    "/api/xq-submissions/:id",
  ],
};
