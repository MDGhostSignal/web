import { NextResponse, type NextRequest } from "next/server";

import {
  cancelColdOutreach,
  rescheduleColdOutreach,
} from "@/lib/cold-outreach-send";
import { supabaseRest } from "@/lib/supabase-admin";
import { isUsTimezone } from "@/lib/timezone";

/**
 * /api/admin/outreach/[id] — manage a single *scheduled* reachout.
 *
 * PATCH  — { scheduledAt, recipientTz? }: reschedule the queued send to
 *          a new instant (Resend PATCH /emails/{id}), and mirror the new
 *          time onto the row.
 * DELETE — cancel the queued send (Resend POST /emails/{id}/cancel) and
 *          mark the row 'canceled'. We keep the row (audit) rather than
 *          hard-deleting it. Once canceled it can't be rescheduled — a
 *          fresh reachout is required to contact the address again.
 *
 * Both require the row to be status='scheduled' with a resend_id.
 *
 * Cookie-gated by the proxy matcher entry "/api/admin/outreach/:path*".
 */

// Reschedule/cancel may retry through Resend's brief post-schedule
// `queued` window (see cold-outreach-send.ts), so allow headroom beyond
// the default serverless cap.
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_SCHEDULE_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_LEAD_MS = 60 * 1000;

type Row = {
  id: string;
  status: string;
  resend_id: string | null;
};

async function loadScheduled(
  id: string,
): Promise<
  | { ok: true; row: Row }
  | { ok: false; status: number; error: string }
> {
  const res = await supabaseRest<Row[]>(
    `cold_outreach?select=id,status,resend_id&id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (!res.ok) {
    return { ok: false, status: 502, error: "Could not load the reachout." };
  }
  const row = res.data?.[0];
  if (!row) return { ok: false, status: 404, error: "Reachout not found." };
  if (row.status !== "scheduled") {
    return {
      ok: false,
      status: 409,
      error: `This reachout is '${row.status}', not scheduled — nothing to change.`,
    };
  }
  if (!row.resend_id) {
    return {
      ok: false,
      status: 409,
      error: "This scheduled reachout has no Resend id to manage.",
    };
  }
  return { ok: true, row };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { scheduledAt?: string; recipientTz?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const d = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return NextResponse.json(
      { error: "A valid scheduledAt is required." },
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

  const loaded = await loadScheduled(id);
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const resend = await rescheduleColdOutreach(loaded.row.resend_id!, d);
  if (!resend.ok) {
    return NextResponse.json({ error: resend.error }, { status: resend.status });
  }

  const patch: Record<string, unknown> = { scheduled_at: d.toISOString() };
  if (body.recipientTz && isUsTimezone(body.recipientTz)) {
    patch.recipient_tz = body.recipientTz;
  }
  const upd = await supabaseRest(
    `cold_outreach?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=minimal",
    },
  );
  if (!upd.ok) {
    // Resend already moved; the row is stale but the reconcile cron will
    // true it up. Report success-with-caveat rather than a hard failure.
    return NextResponse.json({
      ok: true,
      scheduledAt: d.toISOString(),
      warning: "Rescheduled at Resend, but the local row update lagged.",
    });
  }

  return NextResponse.json({ ok: true, scheduledAt: d.toISOString() });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const loaded = await loadScheduled(id);
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const resend = await cancelColdOutreach(loaded.row.resend_id!);
  if (!resend.ok) {
    return NextResponse.json({ error: resend.error }, { status: resend.status });
  }

  const upd = await supabaseRest(
    `cold_outreach?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "canceled" }),
      prefer: "return=minimal",
    },
  );
  if (!upd.ok) {
    return NextResponse.json({
      ok: true,
      warning: "Canceled at Resend, but the local row update lagged.",
    });
  }

  return NextResponse.json({ ok: true });
}
