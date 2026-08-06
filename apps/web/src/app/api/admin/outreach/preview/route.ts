import { NextResponse, type NextRequest } from "next/server";

import {
  coldOutreachEmailHtml,
  defaultOutreachMessage,
} from "@/lib/cold-outreach-email";

/**
 * POST /api/admin/outreach/preview
 * Body: { name?, message?, theme? }
 *
 * Renders the cold-outreach email exactly as /api/admin/outreach
 * would send it for these form values and returns { html } for the
 * composer's preview iframe. No side effects. Same pattern as
 * /api/admin/studio/invite/preview.
 *
 * A blank name renders the real no-name greeting ("Hello,") — exactly
 * what a send without a name would say. theme: "dark" renders the
 * dark variant for the composer's light/dark toggle (sends default
 * to light).
 *
 * assetOrigin is the request origin so hosted images (spinning logo,
 * roster GIF, founder crops) resolve in local dev too; real sends use
 * production.
 *
 * Cookie-gated by the proxy's /api/admin/outreach/* matcher.
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; message?: string; theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const html = coldOutreachEmailHtml({
    name: body.name?.trim() ?? "",
    message: body.message?.trim() || defaultOutreachMessage(),
    assetOrigin: req.nextUrl.origin,
    theme: body.theme === "dark" ? "dark" : "light",
  });

  return NextResponse.json({ html });
}
