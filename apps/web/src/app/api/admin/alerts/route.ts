import { NextResponse } from "next/server";

import type { CrmAlert } from "@/lib/alerts";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shape returned by the embedded PostgREST join. Member is partial
 *  by design — only the columns the bell dropdown + alerts page need. */
type AlertWithMember = CrmAlert & {
  member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    owner: string | null;
    phase: string;
    organization: string | null;
    avatar_url: string | null;
  } | null;
};

/**
 * GET /api/admin/alerts — list open alerts joined with member basics.
 *
 * Open = `resolved_at IS NULL` AND (`snoozed_until IS NULL` OR
 * `snoozed_until < now()`). Snoozed-but-not-yet-due alerts are hidden
 * so the bell badge doesn't nag during their snooze window.
 *
 * Optional `?owner=<name>` filter narrows to alerts whose member's
 * `owner` equals that value (used by "My alerts" toggle).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const includeSnoozed = searchParams.get("include_snoozed") === "1";

  // PostgREST embed: select member columns inline so the UI doesn't
  // need a follow-up round-trip per row.
  let path =
    "crm_alerts?select=*,member:members(id,first_name,last_name,email,owner,phase,organization,avatar_url)" +
    "&resolved_at=is.null&order=triggered_at.desc";

  if (!includeSnoozed) {
    // PostgREST `or` filter: null snoozed_until OR snoozed_until in the past.
    const nowIso = new Date().toISOString();
    path += `&or=(snoozed_until.is.null,snoozed_until.lt.${nowIso})`;
  }

  const res = await supabaseRest<AlertWithMember[]>(path);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  const rows = res.data ?? [];
  const filtered = owner
    ? rows.filter((a) => a.member?.owner === owner)
    : rows;

  return NextResponse.json({ ok: true, alerts: filtered });
}
