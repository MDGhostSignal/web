import { NextResponse, type NextRequest } from "next/server";

import { signStudioInvite } from "@/lib/studio-invite";
import {
  defaultInviteWelcome,
  inviteEmailHtml,
} from "@/lib/studio-invite-email";
import { supabaseRest } from "@/lib/supabase-admin";

const REGISTER_URL = "https://www.ghostsignal.cloud/studio/register";

/**
 * POST /api/admin/studio/invite
 * Body: { email, firstName, lastName, kind, orgName, welcome?, note? }
 *
 * `welcome` is the email's main welcome paragraph — the CRM form
 * prefills it with the template text (defaultInviteWelcome) and the
 * team can replace it with a personal message. Empty/omitted falls
 * back to the template. Email HTML lives in lib/studio-invite-email.ts
 * (shared with the /preview endpoint).
 *
 * Team-initiated Studio invite — the only door in while
 * STUDIO_INVITE_ONLY is on. The team picks brand-or-creator and types
 * the brand/show name + contact person here in the CRM; those details
 * ride along in a signed invite token (lib/studio-invite.ts) so the
 * register page opens for this person only, prefilled, with email +
 * member type locked. Three effects:
 *  1. Ensures a members row exists for the email (creates a
 *     discern-phase row for brand-new contacts; existing CRM rows
 *     keep their data, with blanks filled from the form) — so when
 *     the person registers, the existing link-by-email +
 *     quiz-adoption logic unifies everything onto that row.
 *  2. Stamps the chosen member_type on the row (the invite selection
 *     is authoritative — the register API enforces the token's kind).
 *  3. Sends the studio-branded invite email via Resend pointing at
 *     /studio/register?invite=<token>. The email is code-managed here
 *     (not a Supabase dashboard template) so design changes ship with
 *     deploys. Tokens expire after 30 days.
 *
 * People who already have a Studio account (auth_user_id set) get a
 * 409 instead of a confusing invite.
 *
 * Cookie-gated by the proxy's /api/admin/studio/* matcher.
 */
export async function POST(req: NextRequest) {
  let body: {
    email?: string;
    firstName?: string;
    lastName?: string;
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

  const email = body.email?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  if (!firstName) {
    return NextResponse.json({ error: "First name required." }, { status: 400 });
  }
  const kind = body.kind === "brand" || body.kind === "creator" ? body.kind : null;
  if (!kind) {
    return NextResponse.json(
      { error: "Member type (brand or creator) required." },
      { status: 400 },
    );
  }
  const orgName = body.orgName?.trim() ?? "";
  if (!orgName) {
    return NextResponse.json(
      { error: kind === "creator" ? "Show name required." : "Brand name required." },
      { status: 400 },
    );
  }
  const note = body.note?.trim().slice(0, 1000) || null;
  const welcome =
    body.welcome?.trim().slice(0, 2000) || defaultInviteWelcome();

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;
  if (!resendKey || !resendFrom) {
    return NextResponse.json(
      { error: "Email sending is not configured (RESEND_API_KEY / RESEND_FROM)." },
      { status: 500 },
    );
  }

  // --- 1 · Ensure a members row exists -----------------------------
  type ExistingRow = {
    id: string;
    auth_user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    organization: string | null;
    notes: string | null;
  };
  const existingRes = await supabaseRest<ExistingRow[]>(
    `members?select=id,auth_user_id,first_name,last_name,organization,notes&email=ilike.${encodeURIComponent(email)}&limit=1`,
  );
  if (!existingRes.ok) {
    return NextResponse.json(
      { error: `Lookup failed (${existingRes.status}): ${existingRes.detail.slice(0, 200)}` },
      { status: 500 },
    );
  }
  const existing = existingRes.data?.[0] ?? null;

  if (existing?.auth_user_id) {
    return NextResponse.json(
      { error: "This person already has a Studio account — no invite needed." },
      { status: 409 },
    );
  }

  const inviteStamp = `Invited to Studio (${kind} — ${orgName}) via admin on ${new Date().toISOString().slice(0, 10)}${note ? ` — ${note}` : ""}`;
  let memberId: string;
  let mode: "created" | "existing";

  if (existing) {
    mode = "existing";
    memberId = existing.id;
    const patch: Record<string, unknown> = {
      notes: existing.notes ? `${existing.notes}\n${inviteStamp}` : inviteStamp,
      // The invite form's type choice is authoritative — the register
      // API enforces the token's kind, so keep the CRM row in step.
      member_type: kind,
    };
    // Fill blanks only — an existing CRM row's data wins over the form.
    if (!existing.first_name?.trim()) patch.first_name = firstName;
    if (!existing.last_name?.trim() && lastName) patch.last_name = lastName;
    if (!existing.organization?.trim()) patch.organization = orgName;
    const upd = await supabaseRest(
      `members?id=eq.${encodeURIComponent(existing.id)}`,
      { method: "PATCH", body: JSON.stringify(patch), prefer: "return=minimal" },
    );
    if (!upd.ok) {
      return NextResponse.json(
        { error: `Update failed (${upd.status}): ${upd.detail.slice(0, 200)}` },
        { status: 500 },
      );
    }
  } else {
    mode = "created";
    const ins = await supabaseRest<Array<{ id: string }>>("members", {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        member_type: kind,
        organization: orgName,
        phase: "discern",
        phase_entered_at: new Date().toISOString(),
        notes: inviteStamp,
      }),
      prefer: "return=representation",
    });
    if (!ins.ok || !ins.data?.[0]?.id) {
      const detail = ins.ok ? "no row returned" : ins.detail.slice(0, 200);
      return NextResponse.json(
        { error: `Could not create the member row: ${detail}` },
        { status: 500 },
      );
    }
    memberId = ins.data[0].id;
  }

  // --- 2 · Send the branded invite email ---------------------------
  // The token is the key to the (otherwise closed) register page and
  // carries the prefill payload the team just entered.
  const token = signStudioInvite({ email, firstName, lastName, kind, orgName });
  const inviteUrl = `${REGISTER_URL}?invite=${token}`;

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: `${firstName}, you're invited to GHOSTSignal Studio`,
      html: inviteEmailHtml({ firstName, welcome, note, inviteUrl }),
    }),
  });
  if (!sendRes.ok) {
    const detail = await sendRes.text();
    return NextResponse.json(
      {
        error: `Member row saved, but the invite email failed (${sendRes.status}): ${detail.slice(0, 200)}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, memberId, mode });
}
