import { NextResponse, type NextRequest } from "next/server";

import { coldOutreachEmailHtml } from "@/lib/cold-outreach-email";

/**
 * POST /api/admin/outreach/preview
 * Body: { name?, message? }
 *
 * Renders the cold-outreach email exactly as /api/admin/outreach
 * would send it for these form values and returns { html } for the
 * composer's preview iframe. No side effects. Same pattern as
 * /api/admin/studio/invite/preview.
 *
 * Cookie-gated by the proxy's /api/admin/outreach/* matcher.
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const html = coldOutreachEmailHtml({
    name: body.name?.trim() || "there",
    message:
      body.message?.trim() ||
      "(Your personal message appears here — write it in the form.)",
  });

  return NextResponse.json({ html });
}
