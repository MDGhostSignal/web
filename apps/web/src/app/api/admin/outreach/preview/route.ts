import { NextResponse, type NextRequest } from "next/server";

import {
  coldOutreachEmailHtml,
  defaultOutreachMessage,
  parseOutreachAudience,
} from "@/lib/cold-outreach-email";

/**
 * POST /api/admin/outreach/preview
 * Body: { name?, message?, theme?, audience? }
 *
 * Renders the cold-outreach email exactly as /api/admin/outreach
 * would send it for these form values and returns { html } for the
 * composer's preview iframe. No side effects. Same pattern as
 * /api/admin/studio/invite/preview.
 *
 * A blank name renders the real no-name greeting ("Hello,") — exactly
 * what a send without a name would say. theme: "dark" renders the
 * dark variant for the composer's light/dark toggle (sends default
 * to light). audience: "creator" swaps How-we-do-it + quote to the
 * creator invitation copy (default "brand").
 *
 * assetOrigin is the request origin so hosted images (spinning logo,
 * roster GIF, founder crops) resolve in local dev too; real sends use
 * production.
 *
 * Cookie-gated by the proxy's /api/admin/outreach/* matcher.
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    message?: string;
    theme?: string;
    audience?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const audience = parseOutreachAudience(body.audience);
  const html = coldOutreachEmailHtml({
    name: body.name?.trim() ?? "",
    message: body.message?.trim() || defaultOutreachMessage(audience),
    assetOrigin: req.nextUrl.origin,
    theme: body.theme === "dark" ? "dark" : "light",
    audience,
  });

  return NextResponse.json({ html });
}
