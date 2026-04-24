import { NextResponse } from "next/server";

import { adminCookieOptions } from "@/lib/admin-auth";

/**
 * POST /api/admin/logout
 *
 * Clears the admin_auth cookie by setting it with maxAge 0.
 * Returns { ok: true } on success.
 */
export async function POST() {
  const opts = adminCookieOptions();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: opts.name,
    value: "",
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: 0,
  });
  return res;
}
