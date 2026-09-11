import { NextResponse, type NextRequest } from "next/server";

import {
  coldOutreachFollowUpSubject,
  defaultFollowUpMessage,
} from "@/lib/cold-outreach-email";
import { sendColdOutreach } from "@/lib/cold-outreach-send";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * POST /api/admin/outreach/follow-up
 * Body: { name?, email, subject?, message?, theme?, parentId? }
 *
 * Sends a slim follow-up (header lockup + personal note + footer only)
 * to someone already on the outreach list. Always allowed to re-contact
 * (no 409 duplicate guard) — that's the point of a nudge.
 *
 * `subject` is optional; blank falls back to coldOutreachFollowUpSubject.
 * Files a fresh cold_outreach row (status followup_sent / failed) so
 * the overview list shows the nudge distinctly from the initial send.
 * sent_at is stamped at file time. parentId is accepted for future
 * linking and ignored until a parent_id column lands.
 *
 * Cookie-gated by the proxy matcher "/api/admin/outreach/:path*".
 */

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    theme?: string;
    parentId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json(
      { error: "A follow-up message is required." },
      { status: 400 },
    );
  }
  const finalMessage = message || defaultFollowUpMessage();
  const subject =
    body.subject?.trim() || coldOutreachFollowUpSubject(name);
  const theme = body.theme === "dark" ? "dark" : "light";

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending is not configured (RESEND_API_KEY)." },
      { status: 500 },
    );
  }

  const ins = await supabaseRest<Array<{ id: string }>>("cold_outreach", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      message: finalMessage,
      status: "followup_sent",
      sent_at: new Date().toISOString(),
    }),
    prefer: "return=representation",
  });
  if (!ins.ok || !ins.data?.[0]?.id) {
    const detail = ins.ok ? "no row returned" : ins.detail.slice(0, 200);
    if (detail.includes("cold_outreach")) {
      return NextResponse.json(
        {
          error:
            "The cold_outreach table doesn't exist yet — run docs/OUTREACH_SUPABASE_SCHEMA.sql in the Supabase SQL editor first.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: `Could not file the follow-up row: ${detail}` },
      { status: 500 },
    );
  }
  const rowId = ins.data[0].id;

  const sendRes = await sendColdOutreach({
    name,
    email,
    message: finalMessage,
    theme,
    variant: "followup",
    subject,
  });
  if (!sendRes.ok) {
    await supabaseRest(`cold_outreach?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed" }),
      prefer: "return=minimal",
    });
    return NextResponse.json(
      {
        error: `Follow-up filed, but the email failed to send: ${sendRes.error}`,
      },
      { status: sendRes.status },
    );
  }

  if (sendRes.resendId) {
    await supabaseRest(`cold_outreach?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      body: JSON.stringify({ resend_id: sendRes.resendId }),
      prefer: "return=minimal",
    });
  }

  return NextResponse.json({
    ok: true,
    id: rowId,
    parentId: body.parentId ?? null,
  });
}
