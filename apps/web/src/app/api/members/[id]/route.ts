import { NextResponse, type NextRequest } from "next/server";

import { sanitizePayload } from "../route";
import { type AlertKind, resolveOpenAlertsForMember } from "@/lib/alerts";
import {
  linkMemberSubmissionsByEmail,
  type Member,
  type MemberWritable,
} from "@/lib/members";
import { createStudioAdminClient } from "@/lib/studio-auth";
import { supabaseRest } from "@/lib/supabase-admin";

const TABLE = process.env.MEMBERS_TABLE ?? "members";

// Supabase row ids are UUIDs; validate so the route can't be tricked
// into issuing a PostgREST filter on a crafted id segment.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/members/:id
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid member id." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Member[]>(
    `${TABLE}?id=eq.${id}&select=*&limit=1`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch member.", detail: res.detail },
      { status: 502 },
    );
  }

  const member = Array.isArray(res.data) ? res.data[0] : null;
  if (!member) {
    return NextResponse.json(
      { ok: false, error: "Member not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, member });
}

/**
 * PATCH /api/members/:id
 *
 * Body: partial Member. Unknown keys and invalid enum values are
 * silently dropped.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid member id." },
      { status: 400 },
    );
  }

  let body: MemberWritable = {};
  try {
    body = (await req.json()) as MemberWritable;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const payload = sanitizePayload(body);
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No fields to update." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Member[]>(`${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to update member.", detail: res.detail },
      { status: 502 },
    );
  }

  const updated = Array.isArray(res.data) ? res.data[0] : null;
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Member not found." },
      { status: 404 },
    );
  }

  // Auto-resolve open alerts whose trigger this patch likely cleared.
  // The hourly sync will re-detect anything that still applies.
  //   - last_contact_at touched → contact_cold cleared
  //   - lifecycle_steps touched → marketplace_stall cleared
  //   - phase touched           → both cleared (rules probably differ)
  const kindsToResolve: AlertKind[] = [];
  if ("last_contact_at" in payload) kindsToResolve.push("contact_cold");
  if ("lifecycle_steps" in payload) kindsToResolve.push("marketplace_stall");
  if ("phase" in payload) {
    if (!kindsToResolve.includes("contact_cold")) {
      kindsToResolve.push("contact_cold");
    }
    if (!kindsToResolve.includes("marketplace_stall")) {
      kindsToResolve.push("marketplace_stall");
    }
  }
  // Updating the signed-at date is the "renewal logged" action —
  // close the related expiring alert. The cron will reopen if the
  // new dates still fall inside the renewal window.
  if ("contract_signed_at" in payload || "contract_term_months" in payload) {
    kindsToResolve.push("contract_expiring");
  }
  if (kindsToResolve.length > 0) {
    void resolveOpenAlertsForMember(id, kindsToResolve);
  }

  // Re-link XQ/RQ submissions when the member has an email but isn't
  // fully linked — covers an email correction that now matches a
  // submission, or a submission taken before this row was completed.
  // Best-effort; reflected back on the response.
  if (updated.email) {
    const linked = await linkMemberSubmissionsByEmail(updated.id, updated.email, {
      xqSubmissionId: updated.xq_submission_id,
      rqSubmissionId: updated.rq_submission_id,
    });
    if (linked.xq_submission_id) {
      updated.xq_submission_id = linked.xq_submission_id;
      if (linked.xq_archetype) updated.xq_archetype = linked.xq_archetype;
    }
    if (linked.rq_submission_id) {
      updated.rq_submission_id = linked.rq_submission_id;
      if (linked.rq_code) updated.rq_code = linked.rq_code;
    }
  }

  return NextResponse.json({ ok: true, member: updated });
}

/**
 * DELETE /api/members/:id
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid member id." },
      { status: 400 },
    );
  }

  const before = await supabaseRest<Array<{ auth_user_id: string | null }>>(
    `${TABLE}?id=eq.${id}&select=auth_user_id`,
  );
  const authUserId =
    before.ok && Array.isArray(before.data)
      ? before.data[0]?.auth_user_id
      : null;

  const res = await supabaseRest<Member[]>(`${TABLE}?id=eq.${id}`, {
    method: "DELETE",
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete member.", detail: res.detail },
      { status: 502 },
    );
  }

  const deleted = Array.isArray(res.data) ? res.data : [];
  if (deleted.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Member not found." },
      { status: 404 },
    );
  }

  // Don't leave a Studio Auth user behind — that's the empty loop:
  // password sign-in succeeds, /studio finds no members row, landing
  // looks like a failed login. Best-effort; CRM delete still succeeds
  // if Auth is already gone.
  if (authUserId) {
    try {
      await createStudioAdminClient().auth.admin.deleteUser(authUserId);
    } catch (err) {
      console.warn("[members DELETE] Auth user cleanup skipped:", err);
    }
  }

  return NextResponse.json({ ok: true, id });
}
