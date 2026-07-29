import { NextResponse, type NextRequest } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

const REGISTER_URL = "https://www.ghostsignal.cloud/studio/register";

/**
 * POST /api/admin/studio/invite
 * Body: { email, firstName, lastName, note? }
 *
 * Team-initiated Studio invite. Two effects:
 *  1. Ensures a members row exists for the email (creates a
 *     discern-phase row for brand-new contacts; existing CRM rows are
 *     left as they are apart from an invite note) — so when the person
 *     registers, the existing link-by-email + quiz-adoption logic
 *     unifies everything onto that row.
 *  2. Sends the studio-branded invite email via Resend pointing at
 *     /studio/register. The email is code-managed here (not a Supabase
 *     dashboard template) so design changes ship with deploys.
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
  const note = body.note?.trim().slice(0, 1000) || null;

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
    notes: string | null;
  };
  const existingRes = await supabaseRest<ExistingRow[]>(
    `members?select=id,auth_user_id,first_name,last_name,notes&email=ilike.${encodeURIComponent(email)}&limit=1`,
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

  const inviteStamp = `Invited to Studio via admin on ${new Date().toISOString().slice(0, 10)}${note ? ` — ${note}` : ""}`;
  let memberId: string;
  let mode: "created" | "existing";

  if (existing) {
    mode = "existing";
    memberId = existing.id;
    const patch: Record<string, unknown> = {
      notes: existing.notes ? `${existing.notes}\n${inviteStamp}` : inviteStamp,
    };
    // Fill blanks only — an existing CRM row's data wins over the form.
    if (!existing.first_name?.trim()) patch.first_name = firstName;
    if (!existing.last_name?.trim() && lastName) patch.last_name = lastName;
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
        member_type: "other", // they pick brand/creator at registration
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
  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: `${firstName}, you're invited to GhostSignal Studio`,
      html: inviteEmailHtml(firstName, note),
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

/* ---------------- Email ------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Studio-branded invite — same visual system as the auth templates in
 *  docs/STUDIO_EMAIL_TEMPLATES.md: wordmark + STUDIO pill, morse
 *  accent strip, studio palette, Outlook-safe bgcolor CTA. */
function inviteEmailHtml(firstName: string, note: string | null): string {
  const name = escapeHtml(firstName);
  const noteBlock = note
    ? `
          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb; border-left: 3px solid #7c58d6; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #7c58d6;">A note from the team</p>
                    <p style="margin: 0; font-size: 14px; color: #0e1119; line-height: 1.65;">${escapeHtml(note)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e6e8ee; border-radius: 14px;">

          <tr>
            <td style="padding: 28px 36px 0;">
              <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #0e1119;">GhostSignal</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 9px; border: 1px solid #7c58d6; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #7c58d6; vertical-align: 2px;">Studio</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 18px 36px 0;">
              <div style="height: 3px; width: 220px; border-radius: 2px; background-color: #7c58d6; background-image: repeating-linear-gradient(90deg, #7c58d6 0 5px, #ffffff 5px 13px, #7c58d6 13px 33px, #ffffff 33px 41px, #7c58d6 41px 46px, #ffffff 46px 58px);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px 0;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0e1119; line-height: 1.3;">Hi ${name},</h1>
              <p style="margin: 0; font-size: 15px; color: #5a5e66; line-height: 1.65;">
                The GhostSignal team would like to invite you to <strong style="color: #0e1119;">Studio</strong> &mdash; the members&rsquo; workspace where brands and podcasts on our network keep their profile sharp, see who they share the air with, and let us broker the partnerships that fit.
              </p>
            </td>
          </tr>
          ${noteBlock}

          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#7c58d6" style="background-color: #7c58d6; border: 1px solid #6a45c7; border-radius: 10px;">
                    <a href="${REGISTER_URL}" style="display: inline-block; padding: 12px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Create your account</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0; font-size: 12px; color: #6a727b; line-height: 1.6;">
                Button not working? Copy this link into your browser:<br>
                <a href="${REGISTER_URL}" style="color: #7c58d6; word-break: break-all;">${REGISTER_URL}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb; border: 1px solid #e6e8ee; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 13px; color: #5a5e66; line-height: 1.7;">
                      Signing up takes about a minute &mdash; use <strong style="color: #0e1119;">this email address</strong> so we can connect your account to what we already know about you. Confirm your email and you&rsquo;re in.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 28px; border-top: 1px solid #e6e8ee;">
              <p style="margin: 18px 0 0; font-size: 12px; color: #6a727b; line-height: 1.6;">
                &mdash; The GhostSignal team<br>
                You&rsquo;re receiving this because the GhostSignal team invited you to their members&rsquo; workspace. Not interested? You can simply ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
