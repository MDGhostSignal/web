import { NextResponse, type NextRequest } from "next/server";

import { sendColdOutreach } from "@/lib/cold-outreach-send";
import { defaultOutreachMessage } from "@/lib/cold-outreach-email";
import { supabaseRest } from "@/lib/supabase-admin";
import { isUsTimezone } from "@/lib/timezone";

/**
 * /api/admin/outreach — cold-email brand outreach (Mike's tab).
 *
 * GET  — the reachout list, newest first, for /admin/outreach.
 *        Tolerates a missing table (returns tableMissing so the page
 *        can point at docs/OUTREACH_SUPABASE_SCHEMA.sql).
 * POST — { name?, email, message?, theme?, force?, scheduledAt?,
 *        recipientTz? }: files a cold_outreach row, then hands the
 *        email to Resend (lib/cold-outreach-send.ts).
 *
 *        When `scheduledAt` (ISO 8601 UTC) is set, the row is filed
 *        status='scheduled' and Resend holds the mail for delivery at
 *        that exact instant (native scheduled_at, up to 30 days out);
 *        we keep the returned resend_id so it can be rescheduled or
 *        canceled (see [id]/route.ts). Without it, the mail sends
 *        immediately and the row is status='sent' as before.
 *
 *        Repeat contact of an address that's already 'sent' or
 *        'scheduled' 409s unless `force` is set, so nobody gets
 *        double-cold-emailed by accident. Prior 'canceled'/'failed'
 *        rows don't block a fresh attempt.
 *
 *        A Resend failure marks the row status 'failed' (visible in
 *        the list) and returns 502.
 *
 * No auth check here — cookie-gated by the proxy matcher entry
 * "/api/admin/outreach/:path*".
 */

export type OutreachRow = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  scheduled_at: string | null;
  recipient_tz: string | null;
  resend_id: string | null;
  created_at: string | null;
};

const SELECT =
  "select=id,name,email,message,status,sent_at,scheduled_at,recipient_tz,resend_id,created_at";

/** How far ahead Resend allows a scheduled send. */
const MAX_SCHEDULE_MS = 30 * 24 * 60 * 60 * 1000;
/** A little lead so "now-ish" clicks don't land in the past at Resend. */
const MIN_LEAD_MS = 60 * 1000;

export async function GET() {
  const res = await supabaseRest<OutreachRow[]>(
    `cold_outreach?${SELECT}&order=created_at.desc&limit=500`,
  );
  if (!res.ok) {
    // Table not created yet — an empty tab with a setup hint beats a 502.
    if (res.detail.includes("cold_outreach")) {
      return NextResponse.json({ ok: true, outreach: [], tableMissing: true });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to load outreach list.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, outreach: res.data });
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    message?: string;
    theme?: string;
    force?: boolean;
    scheduledAt?: string;
    recipientTz?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Name is optional — the template greets "Hello," and drops the
  // subject's name prefix when it's blank.
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  // Blank message → the standard template text, so the stored row
  // reflects what was actually sent.
  const finalMessage = message || defaultOutreachMessage();
  // Which visual template goes out — picked in the composer.
  const theme = body.theme === "dark" ? "dark" : "light";

  // --- Scheduling validation -------------------------------------
  let scheduledAt: Date | null = null;
  let recipientTz: string | null = null;
  if (body.scheduledAt != null && body.scheduledAt !== "") {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "scheduledAt is not a valid date." },
        { status: 400 },
      );
    }
    const delta = d.getTime() - Date.now();
    if (delta < MIN_LEAD_MS) {
      return NextResponse.json(
        { error: "Scheduled time must be at least a minute in the future." },
        { status: 400 },
      );
    }
    if (delta > MAX_SCHEDULE_MS) {
      return NextResponse.json(
        { error: "Scheduled time can be at most 30 days out (Resend's limit)." },
        { status: 400 },
      );
    }
    scheduledAt = d;
    // recipientTz is display metadata; validate but don't hard-require.
    if (body.recipientTz && isUsTimezone(body.recipientTz)) {
      recipientTz = body.recipientTz;
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email sending is not configured (RESEND_API_KEY)." },
      { status: 500 },
    );
  }

  // --- Duplicate guard -------------------------------------------
  // Only a live prior contact blocks — 'sent' (already emailed) or
  // 'scheduled' (queued). Canceled/failed attempts don't count.
  const dupRes = await supabaseRest<Array<{ created_at: string | null; status: string }>>(
    `cold_outreach?select=created_at,status&email=ilike.${encodeURIComponent(email)}&status=in.(sent,scheduled)&order=created_at.desc&limit=1`,
  );
  if (!dupRes.ok && dupRes.detail.includes("cold_outreach")) {
    return NextResponse.json(
      {
        error:
          "The cold_outreach table doesn't exist yet — run docs/OUTREACH_SUPABASE_SCHEMA.sql (and OUTREACH_SCHEDULING_SCHEMA.sql) in the Supabase SQL editor first.",
      },
      { status: 500 },
    );
  }
  const previous = dupRes.ok ? (dupRes.data?.[0] ?? null) : null;
  if (previous && body.force !== true) {
    return NextResponse.json(
      {
        error: "This address was already contacted.",
        alreadyContactedAt: previous.created_at,
        alreadyStatus: previous.status,
      },
      { status: 409 },
    );
  }

  // --- 1 · File the row ------------------------------------------
  const ins = await supabaseRest<Array<{ id: string }>>("cold_outreach", {
    method: "POST",
    body: JSON.stringify(
      scheduledAt
        ? {
            name,
            email,
            message: finalMessage,
            status: "scheduled",
            scheduled_at: scheduledAt.toISOString(),
            recipient_tz: recipientTz,
          }
        : {
            name,
            email,
            message: finalMessage,
            status: "sent",
            sent_at: new Date().toISOString(),
          },
    ),
    prefer: "return=representation",
  });
  if (!ins.ok || !ins.data?.[0]?.id) {
    const detail = ins.ok ? "no row returned" : ins.detail.slice(0, 200);
    return NextResponse.json(
      { error: `Could not file the outreach row: ${detail}` },
      { status: 500 },
    );
  }
  const rowId = ins.data[0].id;

  // --- 2 · Hand to Resend (immediate or scheduled) ---------------
  const sendRes = await sendColdOutreach({
    name,
    email,
    message: finalMessage,
    theme,
    scheduledAt: scheduledAt ?? undefined,
  });
  if (!sendRes.ok) {
    await supabaseRest(`cold_outreach?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed" }),
      prefer: "return=minimal",
    });
    return NextResponse.json(
      {
        error: scheduledAt
          ? `Reachout filed, but Resend rejected the scheduled send: ${sendRes.error}`
          : `Reachout filed, but the email failed to send: ${sendRes.error}`,
      },
      { status: sendRes.status },
    );
  }

  // Store Resend's id so a scheduled send can later be rescheduled /
  // canceled. (Harmless to store for immediate sends too.)
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
    scheduled: Boolean(scheduledAt),
    scheduledAt: scheduledAt?.toISOString() ?? null,
  });
}
