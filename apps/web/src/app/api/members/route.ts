import { NextResponse, type NextRequest } from "next/server";

import {
  MEMBER_STAGES,
  MEMBER_TYPES,
  type Member,
  type MemberWritable,
} from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

const TABLE = process.env.MEMBERS_TABLE ?? "members";

/**
 * GET /api/members
 *
 * Returns the full Members list. No auth check — the shared-password
 * middleware in src/middleware.ts already gates /api/members/* via the
 * matcher rule added for Phase 3.
 */
export async function GET() {
  const res = await supabaseRest<Member[]>(
    `${TABLE}?select=*&order=created_at.desc&limit=1000`,
  );

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch members.", detail: res.detail },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: res.data.length,
    members: res.data,
  });
}

/**
 * POST /api/members
 *
 * Body: Partial<Member> (id / created_at / updated_at ignored).
 * Required: at minimum `first_name` or `last_name` or `organization` so
 * the row has *something* to render in a list.
 *
 * On success: 200 with the created row.
 */
export async function POST(req: NextRequest) {
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

  const hasIdentifier =
    (payload.first_name && payload.first_name.length > 0) ||
    (payload.last_name && payload.last_name.length > 0) ||
    (payload.organization && payload.organization.length > 0);
  if (!hasIdentifier) {
    return NextResponse.json(
      {
        ok: false,
        error: "A member needs at least a first name, last name, or organization.",
      },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Member[]>(TABLE, {
    method: "POST",
    body: JSON.stringify(payload),
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to create member.", detail: res.detail },
      { status: 502 },
    );
  }

  const created = Array.isArray(res.data) ? res.data[0] : res.data;
  return NextResponse.json({ ok: true, member: created });
}

/* =====================================================================
 * Helpers
 * ===================================================================== */

/**
 * Strip unknown keys, trim strings, coerce empty strings to null,
 * and validate enum values. Anything invalid is dropped rather than
 * rejected — the client UI is the source of truth for valid enums, so
 * we optimise for forgiving API calls from our own UI over strict
 * validation.
 */
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
