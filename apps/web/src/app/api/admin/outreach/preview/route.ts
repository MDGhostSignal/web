import { NextResponse, type NextRequest } from "next/server";

import {
  coldOutreachEmailHtml,
  coldOutreachFollowUpEmailHtml,
  defaultFollowUpMessage,
  defaultOutreachMessage,
  parseOutreachAudience,
} from "@/lib/cold-outreach-email";

/**
 * POST /api/admin/outreach/preview
 * Body: { name?, message?, theme?, audience?, variant? }
 *
 * Renders the cold-outreach email exactly as /api/admin/outreach
 * (or /follow-up) would send it for these form values and returns
 * { html } for the composer's preview iframe. No side effects. Same
 * pattern as /api/admin/studio/invite/preview.
 *
 * variant "followup" → slim header + note + footer (no pitch body).
 * Otherwise the full invitation email. A blank name renders the real
 * no-name greeting ("Hello,"). theme: "dark" for the composer's
 * toggle. audience: "creator" swaps How-we-do-it + quote (full only).
 *
 * assetOrigin is the request origin so hosted images resolve in local
 * dev; real sends use production.
 *
 * Cookie-gated by the proxy's /api/admin/outreach/* matcher.
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    message?: string;
    theme?: string;
    audience?: string;
    variant?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const theme = body.theme === "dark" ? "dark" : "light";
  const name = body.name?.trim() ?? "";
  const assetOrigin = req.nextUrl.origin;

  if (body.variant === "followup") {
    const html = coldOutreachFollowUpEmailHtml({
      name,
      message: body.message?.trim() || defaultFollowUpMessage(),
      assetOrigin,
      theme,
    });
    return NextResponse.json({ html });
  }

  const audience = parseOutreachAudience(body.audience);
  const html = coldOutreachEmailHtml({
    name,
    message: body.message?.trim() || defaultOutreachMessage(audience),
    assetOrigin,
    theme,
    audience,
  });

  return NextResponse.json({ html });
}
