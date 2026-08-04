import { NextResponse, type NextRequest } from "next/server";

import {
  loadStudioOrgProfile,
  loadStudioRqSummary,
  loadStudioXqSummary,
} from "@/lib/studio-data";
import { supabaseRest } from "@/lib/supabase-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/studio/members/[id]
 *
 * Full dossier for one Studio member, for the /admin/studio-members
 * detail view: the members row, their org card (linked brand/creator
 * row, or the personal card for org-less accounts — same loader the
 * member's own /studio/profile uses), and their XQ + RQ summaries.
 * Cookie-gated by the proxy's /api/admin/studio/* matcher.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid member id." }, { status: 400 });
  }

  type MemberRow = {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    organization: string | null;
    member_type: "brand" | "creator" | "other";
    phase: string | null;
    created_at: string | null;
    activated_at: string | null;
    avatar_url: string | null;
    tagline: string | null;
    bio: string | null;
    brand_id: string | null;
    creator_id: string | null;
    xq_submission_id: string | null;
    xq_archetype: string | null;
    rq_submission_id: string | null;
    rq_code: string | null;
    nl_ads_interest: boolean | null;
    nl_provider: string | null;
    nl_open_rate: string | null;
    nl_frequency: string | null;
    nl_subscribers: string | null;
  };

  const res = await supabaseRest<MemberRow[]>(
    "members?select=id,email,first_name,last_name,organization,member_type,phase,created_at,activated_at,avatar_url,tagline,bio,brand_id,creator_id,xq_submission_id,xq_archetype,rq_submission_id,rq_code,nl_ads_interest,nl_provider,nl_open_rate,nl_frequency,nl_subscribers&" +
      `id=eq.${encodeURIComponent(id)}`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `Load failed (${res.status}): ${res.detail.slice(0, 200)}` },
      { status: 500 },
    );
  }
  const m = res.data?.[0];
  if (!m) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const kind =
    m.member_type === "brand" || m.member_type === "creator"
      ? m.member_type
      : ("other" as const);
  const [org, xq, rq] = await Promise.all([
    loadStudioOrgProfile({
      id: m.id,
      kind,
      brandId: m.brand_id,
      creatorId: m.creator_id,
    }),
    loadStudioXqSummary(m.xq_submission_id),
    loadStudioRqSummary(m.rq_submission_id),
  ]);

  return NextResponse.json({ ok: true, member: m, org, xq, rq });
}

/**
 * DELETE /api/admin/studio/members/[id]
 *
 * Remove a member from Studio Lite. This is a deactivation, not a row
 * delete: `activated_at` goes back to null, so the account drops off
 * /admin/studio-members, and the member's next request lands on
 * /studio/pending (isApproved gates every studio page and every
 * foundation write helper). The CRM row, quiz links, auth account,
 * picks, and request history all stay intact — re-activating via
 * /admin/studio-approvals (or re-inviting) restores access unchanged.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid member id." }, { status: 400 });
  }

  const res = await supabaseRest<Array<{ id: string }>>(
    `members?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ activated_at: null }),
      prefer: "return=representation",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Remove failed (${res.status}): ${res.detail.slice(0, 200)}` },
      { status: 500 },
    );
  }
  if (!res.data || res.data.length === 0) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
