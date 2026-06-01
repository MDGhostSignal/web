import { NextResponse } from "next/server";

import type { CrmAlert } from "@/lib/alerts";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shape returned by the embedded PostgREST joins. Exactly one of
 *  `member` / `task` is populated per row, mirroring the subject-check
 *  constraint in the DB. */
type AlertWithSubject = CrmAlert & {
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
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    created_by: string | null;
  } | null;
};

/**
 * GET /api/admin/alerts — list open alerts joined with their subject.
 *
 * Open = `resolved_at IS NULL` AND (`snoozed_until IS NULL` OR
 * `snoozed_until < now()`). Snoozed-but-not-yet-due alerts are hidden
 * so the bell badge doesn't nag during their snooze window.
 *
 * Optional `?owner=<name>` filter narrows to alerts whose subject
 * routes to that owner. For member alerts the owner is
 * `member.owner`; for task alerts it's `task.assigned_to` (falling
 * back to `task.created_by` when unassigned).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const includeSnoozed = searchParams.get("include_snoozed") === "1";

  let path =
    "crm_alerts?select=*," +
    "member:members(id,first_name,last_name,email,owner,phase,organization,avatar_url)," +
    "task:design_tasks(id,title,status,priority,assigned_to,created_by)" +
    "&resolved_at=is.null&order=triggered_at.desc";

  if (!includeSnoozed) {
    const nowIso = new Date().toISOString();
    path += `&or=(snoozed_until.is.null,snoozed_until.lt.${nowIso})`;
  }

  const res = await supabaseRest<AlertWithSubject[]>(path);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  const rows = res.data ?? [];
  const filtered = owner
    ? rows.filter((a) => {
        const subjectOwner =
          a.member?.owner ?? a.task?.assigned_to ?? a.task?.created_by ?? null;
        return subjectOwner === owner;
      })
    : rows;

  return NextResponse.json({ ok: true, alerts: filtered });
}
