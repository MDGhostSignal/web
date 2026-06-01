import { NextResponse, type NextRequest } from "next/server";

import {
  initLifecycleSteps,
  LIFECYCLE_STEPS,
  MEMBER_PHASES,
  MEMBER_TYPES,
  STEP_STATUSES,
  type LifecycleSteps,
  type Member,
  type MemberType,
  type MemberWritable,
  type StepStatus,
} from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

const TABLE = process.env.MEMBERS_TABLE ?? "members";

/**
 * GET /api/members
 *
 * Returns the full Members list. No auth check — the shared-password
 * proxy in src/proxy.ts already gates /api/members/* via the
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
 * Body: Partial<Member> (id / created_at / updated_at / phase_entered_at
 * ignored). Required: at minimum `first_name` or `last_name` or
 * `organization` so the row has *something* to render in a list.
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

  // Seed the lifecycle checklist server-side when the caller didn't
  // provide one — keeps the default in sync with LIFECYCLE_STEPS
  // regardless of which client creates the row.
  if (!payload.lifecycle_steps) {
    const memberType: MemberType = payload.member_type ?? "creator";
    payload.lifecycle_steps = initLifecycleSteps(memberType);
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
 * Helpers (duplicated in [id]/route.ts — keep in sync)
 * ===================================================================== */

export function sanitizePayload(input: MemberWritable): MemberWritable {
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
    "last_response",
    "shipping_address_line1",
    "shipping_address_line2",
    "shipping_city",
    "shipping_state",
    "shipping_postal_code",
    "shipping_country",
    "avatar_url",
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

  // contact_count is a non-negative integer; coerce + clamp.
  if (typeof input.contact_count === "number") {
    const n = Math.floor(input.contact_count);
    out.contact_count = Number.isFinite(n) && n >= 0 ? n : 0;
  } else if (input.contact_count === null) {
    out.contact_count = null;
  }

  if (typeof input.member_type === "string") {
    const v = input.member_type as (typeof MEMBER_TYPES)[number];
    if (MEMBER_TYPES.includes(v)) out.member_type = v;
  }

  if (typeof input.phase === "string") {
    const v = input.phase as (typeof MEMBER_PHASES)[number];
    if (MEMBER_PHASES.includes(v)) out.phase = v;
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

  if (typeof input.became_member_at === "string") {
    out.became_member_at = input.became_member_at;
  } else if (input.became_member_at === null) {
    out.became_member_at = null;
  }

  if (typeof input.rq_submission_id === "string") {
    out.rq_submission_id = input.rq_submission_id;
  } else if (input.rq_submission_id === null) {
    out.rq_submission_id = null;
  }

  if (typeof input.xq_submission_id === "string") {
    out.xq_submission_id = input.xq_submission_id;
  } else if (input.xq_submission_id === null) {
    out.xq_submission_id = null;
  }

  // contract_signed_at: ISO date string (YYYY-MM-DD).
  if (typeof input.contract_signed_at === "string") {
    out.contract_signed_at = input.contract_signed_at;
  } else if (input.contract_signed_at === null) {
    out.contract_signed_at = null;
  }

  // contract_term_months: integer clamped to [1, 60] (matches the
  // CHECK constraint in CRM_MEMBERS_CONTRACT_FIELDS_MIGRATION.sql).
  if (typeof input.contract_term_months === "number") {
    const n = Math.floor(input.contract_term_months);
    if (Number.isFinite(n) && n >= 1 && n <= 60) {
      out.contract_term_months = n;
    }
  }

  if (input.lifecycle_steps && typeof input.lifecycle_steps === "object") {
    out.lifecycle_steps = sanitizeLifecycleSteps(input.lifecycle_steps);
  }

  return out;
}

const KNOWN_STEP_KEYS = new Set(LIFECYCLE_STEPS.map((s) => s.key));

/**
 * Drops unknown step keys, validates status enum, and ensures
 * completed_at is either an ISO-ish date string or null. Anything
 * malformed is coerced to a safe default rather than rejected.
 */
function sanitizeLifecycleSteps(
  input: unknown,
): LifecycleSteps {
  const out: LifecycleSteps = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;

  const obj = input as Record<string, unknown>;
  for (const [key, raw] of Object.entries(obj)) {
    if (!KNOWN_STEP_KEYS.has(key)) continue;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;

    const rec = raw as { status?: unknown; completed_at?: unknown };
    const status =
      typeof rec.status === "string" &&
      (STEP_STATUSES as readonly string[]).includes(rec.status)
        ? (rec.status as StepStatus)
        : "todo";

    const completed_at =
      typeof rec.completed_at === "string" && rec.completed_at.length > 0
        ? rec.completed_at
        : null;

    out[key] = { status, completed_at };
  }

  return out;
}
