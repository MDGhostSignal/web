import { NextResponse, type NextRequest } from "next/server";

import {
  adminCookieOptions,
  issueAdminCookie,
  verifyAdminPassword,
} from "@/lib/admin-auth";

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
 */
export async function POST(req: NextRequest) {
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
    // Small deliberate delay so brute-force attempts are slower. The
    // verify itself is already constant-time; this adds wall-clock
    // friction without leaking per-password timing signal.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(
      { ok: false, error: "Invalid password." },
      { status: 401 },
    );
  }

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
