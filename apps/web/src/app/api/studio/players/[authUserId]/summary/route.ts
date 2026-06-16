import { NextResponse, type NextRequest } from "next/server";

import {
  createStudioAdminClient,
  loadCurrentStudioMember,
} from "@/lib/studio-auth";

/**
 * GET /api/studio/players/[authUserId]/summary
 *
 * Drives the in-world "press E on another player" card. Returns the
 * RQ + XQ + identity summary for the target Supabase auth user.
 *
 * Auth: viewer must be an approved Studio member. We resolve viewer
 * identity through the cookie-bound Supabase session — anonymous /
 * unapproved callers get 401. We deliberately don't expose this to
 * the public /world surface; that page joins as guests with no
 * authUserId, so they never need to call this.
 *
 * The lookup uses the service-role admin client so RLS doesn't gate
 * cross-member reads — the auth check above is the trust boundary.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ authUserId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const viewer = await loadCurrentStudioMember();
  if (!viewer) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!viewer.isApproved) {
    return NextResponse.json(
      { ok: false, error: "Account pending approval." },
      { status: 403 },
    );
  }

  const { authUserId } = await params;
  if (!authUserId) {
    return NextResponse.json(
      { ok: false, error: "authUserId required." },
      { status: 400 },
    );
  }

  const admin = createStudioAdminClient();

  const { data: member, error: memberErr } = await admin
    .from("members")
    .select(
      "id, first_name, last_name, organization, member_type, xq_submission_id, rq_submission_id, xq_archetype, rq_code",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (memberErr) {
    return NextResponse.json(
      { ok: false, error: memberErr.message },
      { status: 500 },
    );
  }
  if (!member) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  // XQ + RQ are optional — a member can exist without having taken
  // either quiz. Surface what's there; the in-world card handles nulls.
  let xq: PlayerSummary["xq"] = null;
  if (member.xq_submission_id) {
    const { data: x } = await admin
      .from("xq_submissions")
      .select(
        "xq_code, xq_archetype_name, xq_archetype_tagline, axis_continuity_change, axis_person_system, axis_craft_leverage, non_negotiables_json, core_values_json, aspirational_values_json",
      )
      .eq("id", member.xq_submission_id)
      .maybeSingle();
    if (x) {
      xq = {
        code: x.xq_code ?? member.xq_archetype ?? null,
        archetypeName: x.xq_archetype_name ?? null,
        tagline: x.xq_archetype_tagline ?? null,
        axes: {
          continuityChange: x.axis_continuity_change ?? null,
          personSystem: x.axis_person_system ?? null,
          craftLeverage: x.axis_craft_leverage ?? null,
        },
        values: {
          nonNegotiables: x.non_negotiables_json ?? [],
          core: x.core_values_json ?? [],
          aspirational: x.aspirational_values_json ?? [],
        },
      };
    }
  }
  // Fallback: even without a linked submission row, the denormalized
  // xq_archetype on members is enough to show the code in the card.
  if (!xq && member.xq_archetype) {
    xq = {
      code: member.xq_archetype,
      archetypeName: null,
      tagline: null,
      axes: { continuityChange: null, personSystem: null, craftLeverage: null },
      values: { nonNegotiables: [], core: [], aspirational: [] },
    };
  }

  let rq: PlayerSummary["rq"] = null;
  if (member.rq_submission_id) {
    const { data: r } = await admin
      .from("rq_submissions")
      .select(
        "rq_code, rq_name, signal_clarity_label, signal_clarity_note, undertone",
      )
      .eq("id", member.rq_submission_id)
      .maybeSingle();
    if (r) {
      rq = {
        code: r.rq_code ?? member.rq_code ?? null,
        name: r.rq_name ?? null,
        clarityLabel: r.signal_clarity_label ?? null,
        clarityNote: r.signal_clarity_note ?? null,
        undertone: r.undertone ?? null,
      };
    }
  }
  if (!rq && member.rq_code) {
    rq = {
      code: member.rq_code,
      name: null,
      clarityLabel: null,
      clarityNote: null,
      undertone: null,
    };
  }

  const player: PlayerSummary = {
    authUserId,
    firstName: member.first_name,
    lastName: member.last_name,
    organization: member.organization,
    memberType:
      member.member_type === "brand" || member.member_type === "creator"
        ? member.member_type
        : "other",
    xq,
    rq,
  };

  return NextResponse.json({ ok: true, player });
}

export type PlayerSummary = {
  authUserId: string;
  firstName: string | null;
  lastName: string | null;
  organization: string | null;
  memberType: "brand" | "creator" | "other";
  xq: {
    code: string | null;
    archetypeName: string | null;
    tagline: string | null;
    axes: {
      continuityChange: string | null;
      personSystem: string | null;
      craftLeverage: string | null;
    };
    values: {
      nonNegotiables: string[];
      core: string[];
      aspirational: string[];
    };
  } | null;
  rq: {
    code: string | null;
    name: string | null;
    clarityLabel: string | null;
    clarityNote: string | null;
    undertone: string | null;
  } | null;
};
