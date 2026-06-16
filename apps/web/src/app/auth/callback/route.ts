import { NextResponse } from "next/server";

import { createStudioServerClient } from "@/lib/studio-auth";

/** Supabase email-confirmation + magic-link landing.
 *
 * Two shapes arrive here:
 *   - Success: ?code=<pkce> — we exchange it for a session, set
 *     cookies, then send the user to /studio (the gate routes them
 *     to /studio/pending if not yet approved).
 *   - Failure: ?error=...&error_code=...&error_description=... — we
 *     forward the error to /studio/login so it can render a clear
 *     "your confirmation link expired" panel.
 *
 * Without this route, the Site URL fallback used to land on `/` where
 * no client SDK could consume the hash/code, so even valid clicks
 * silently failed. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorCode =
    url.searchParams.get("error_code") ?? url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (errorCode) {
    const params = new URLSearchParams({ auth_error: errorCode });
    if (errorDescription) params.set("auth_message", errorDescription);
    return NextResponse.redirect(
      new URL(`/studio/login?${params.toString()}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/studio/login?auth_error=missing_code", url.origin),
    );
  }

  const supabase = await createStudioServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const params = new URLSearchParams({
      auth_error: "exchange_failed",
      auth_message: error.message,
    });
    return NextResponse.redirect(
      new URL(`/studio/login?${params.toString()}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL("/studio", url.origin));
}
