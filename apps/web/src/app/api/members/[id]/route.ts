import { NextResponse, type NextRequest } from "next/server";

import {
  MEMBER_STAGES,
  MEMBER_TYPES,
  type Member,
  type MemberWritable,
} from "@/lib/members";
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

  return NextResponse.json({ ok: true, id });
}

/* =====================================================================
 * Helpers (mirrored with POST in /api/members/route.ts)
 * ===================================================================== */

function sanitizePayload(input: MemberWritable): MemberWritable {
  const out: MemberWritable = {};

  const stringKeys = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "organization",
    "role",
    "website",
    "owner",
    "next_step",
    "notes",
  ] as const;

  for (const key of stringKeys) {
    const v = input[key];
    if (typeof v === "string") {
      const trimmed = v.trim();
      out[key] = trimmed.length > 0 ? trimmed : null;
    } else if (v === null) {
      out[key] = null;
    }
  }

  if (typeof input.member_type === "string") {
    const v = input.member_type as (typeof MEMBER_TYPES)[number];
    if (MEMBER_TYPES.includes(v)) out.member_type = v;
  }

  if (typeof input.stage === "string") {
    const v = input.stage as (typeof MEMBER_STAGES)[number];
    if (MEMBER_STAGES.includes(v)) out.stage = v;
  }

  if (Array.isArray(input.tags)) {
    out.tags = input.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  if (typeof input.last_contact_at === "string") {
    out.last_contact_at = input.last_contact_at;
  } else if (input.last_contact_at === null) {
    out.last_contact_at = null;
  }

  if (typeof input.rq_submission_id === "string") {
    out.rq_submission_id = input.rq_submission_id;
  } else if (input.rq_submission_id === null) {
    out.rq_submission_id = null;
  }

  return out;
}
