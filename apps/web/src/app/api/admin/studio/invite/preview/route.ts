import { NextResponse, type NextRequest } from "next/server";

import {
  defaultInviteWelcome,
  inviteEmailHtml,
} from "@/lib/studio-invite-email";

/**
 * POST /api/admin/studio/invite/preview
 * Body: { firstName?, kind?, orgName?, welcome?, note? }
 *
 * Renders the invite email exactly as /api/admin/studio/invite would
 * send it for these form values and returns { html } for the CRM
 * modal's preview iframe. No side effects: nothing is written, no
 * email is sent, and the CTA carries a placeholder link instead of a
 * real signed token.
 *
 * Cookie-gated by the proxy's /api/admin/studio/* matcher.
 */
export async function POST(req: NextRequest) {
  let body: {
    firstName?: string;
    kind?: string;
    orgName?: string;
    welcome?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const welcome =
    body.welcome?.trim().slice(0, 2000) || defaultInviteWelcome();

  const html = inviteEmailHtml({
    firstName: body.firstName?.trim() || "Alex",
    welcome,
    note: body.note?.trim().slice(0, 1000) || null,
    inviteUrl:
      "https://www.ghostsignal.cloud/studio/register?invite=preview-only",
  });

  return NextResponse.json({ html });
}
