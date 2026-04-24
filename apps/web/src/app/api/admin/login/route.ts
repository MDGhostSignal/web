import { NextResponse, type NextRequest } from "next/server";

import {
  adminCookieOptions,
  issueAdminCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  checkRateLimit,
  clearKey,
  recordFailure,
} from "@/lib/rate-limit";

/**
 * POST /api/admin/login
 *
 * Body: { password: string, next?: string }
 *
 * On success: sets the admin_auth cookie and returns
 *   { ok: true, next: string }
 * where `next` is the sanitised redirect path (defaults to /admin).
 *
 * On failure: 401 with { ok: false, error: "Invalid password." }.
 *
 * Rate limited per IP: 5 failed attempts inside a 10-minute sliding
 * window triggers a 15-minute lock. Successful login clears the
 * counter so a user who mistyped twice doesn't carry state.
 */
export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);

  // Pre-check: if this IP is locked, reject immediately without even
  // comparing the password. Saves a wall-clock millisecond and
  // doesn't exercise the verify path at all.
  const pre = checkRateLimit(clientKey);
  if (!pre.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many attempts. Try again later.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(pre.retryAfterSec) },
      },
    );
  }

  let body: { password?: string; next?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fall through — empty body is a 400
  }

  const submitted = typeof body.password === "string" ? body.password : "";
  if (!submitted) {
    return NextResponse.json(
      { ok: false, error: "Password is required." },
      { status: 400 },
    );
  }

  if (!verifyAdminPassword(submitted)) {
    // Record the failure — may lock the key for subsequent requests.
    const post = recordFailure(clientKey);
    // Small deliberate delay so brute-force attempts are slower. The
    // verify itself is already constant-time; this adds wall-clock
    // friction without leaking per-password timing signal.
    await new Promise((r) => setTimeout(r, 600));

    if (!post.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many attempts. Try again later.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(post.retryAfterSec) },
        },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Invalid password." },
      { status: 401 },
    );
  }

  // Success — reset the counter so legitimate users who mistyped a
  // couple times don't stay penalised.
  clearKey(clientKey);

  // Sanitise `next` so it can't be abused as an open redirect — must be
  // a site-local absolute path, and falls back to /admin if not.
  const rawNext = typeof body.next === "string" ? body.next : "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/admin";

  const cookieValue = await issueAdminCookie();
  const opts = adminCookieOptions();

  const res = NextResponse.json({ ok: true, next });
  res.cookies.set({
    name: opts.name,
    value: cookieValue,
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return res;
}

/**
 * Rate-limit key. Prefer the left-most entry in `x-forwarded-for`
 * (Vercel/Cloudflare set this to the originating client IP). Fall
 * back to `x-real-ip`, then to a sentinel so the limiter still
 * counts even if headers are missing — better to over-limit than
 * silently let a brute-force through.
 */
function getClientKey(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
