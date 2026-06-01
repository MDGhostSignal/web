import { NextResponse } from "next/server";

import {
  detectAlertForTask,
  detectAlertsForMember,
  type AlertKind,
  type CrmAlert,
  type StaleTaskCandidate,
} from "@/lib/alerts";
import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/admin-auth";
import type { Member } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/alerts/sync — detection job entry point.
 *
 * Runs hourly from .github/workflows/crm-alerts-sync.yml via a Bearer
 * CRON_SECRET. Also reachable from the in-app "Refresh alerts now"
 * button. Idempotent — every run computes the desired set of open
 * alerts from scratch (members + tasks) and reconciles:
 *
 *   - subjects that should have an alert AND don't  → insert
 *   - alerts whose subject no longer qualifies      → resolve
 *   - alerts that still apply                       → leave alone
 *
 * Returns counts so the cron can log progress.
 */
export async function POST(req: Request) {
  // Two auth paths: CRON_SECRET bearer or admin cookie.
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearerOk = cronSecret && auth === `Bearer ${cronSecret}`;

  let ok = bearerOk;
  if (!ok) {
    const cookie = req.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`))
      ?.split("=")[1];
    ok = !!cookie && (await verifyAdminCookie(cookie));
  }
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  // ── Fetch members ───────────────────────────────────────────────────
  const memberCols = [
    "id",
    "phase",
    "phase_entered_at",
    "last_contact_at",
    "created_at",
    "updated_at",
    "lifecycle_steps",
    "owner",
    "became_member_at",
    "contract_signed_at",
    "contract_term_months",
  ].join(",");
  const memRes = await supabaseRest<Member[]>(
    `members?select=${memberCols}`,
  );
  if (!memRes.ok) {
    return NextResponse.json(
      { ok: false, error: memRes.detail },
      { status: memRes.status },
    );
  }
  const members = memRes.data ?? [];

  // ── Fetch active tasks + their latest-comment timestamp ────────────
  // Skip terminal statuses early to keep the payload small.
  const taskCols = [
    "id",
    "title",
    "status",
    "priority",
    "assigned_to",
    "created_by",
    "created_at",
    "updated_at",
  ].join(",");
  const taskRes = await supabaseRest<
    Omit<StaleTaskCandidate, "latest_comment_at">[]
  >(`design_tasks?select=${taskCols}&status=not.in.(completed,archived)`);
  if (!taskRes.ok) {
    return NextResponse.json(
      { ok: false, error: taskRes.detail },
      { status: taskRes.status },
    );
  }
  const rawTasks = taskRes.data ?? [];

  // Pull comment timestamps in one shot, then bucket by task_id.
  // For modest comment volumes this is cheaper than per-task queries.
  const commentRes = await supabaseRest<
    { task_id: string; created_at: string }[]
  >("design_task_comments?select=task_id,created_at");
  const latestCommentAt = new Map<string, string>();
  if (commentRes.ok) {
    for (const c of commentRes.data ?? []) {
      const prev = latestCommentAt.get(c.task_id);
      if (!prev || c.created_at > prev) latestCommentAt.set(c.task_id, c.created_at);
    }
  }
  const tasks: StaleTaskCandidate[] = rawTasks.map((t) => ({
    ...t,
    latest_comment_at: latestCommentAt.get(t.id) ?? null,
  }));

  // ── Existing open alerts, keyed by (kind, subject_id) ──────────────
  const openRes = await supabaseRest<CrmAlert[]>(
    "crm_alerts?select=id,kind,member_id,task_id&resolved_at=is.null",
  );
  if (!openRes.ok) {
    return NextResponse.json(
      { ok: false, error: openRes.detail },
      { status: openRes.status },
    );
  }
  // Key shape: `${kind}|m:${member_id}` or `${kind}|t:${task_id}`.
  const existingOpen = new Map<string, string>();
  for (const a of openRes.data ?? []) {
    const subjectKey = a.member_id ? `m:${a.member_id}` : `t:${a.task_id}`;
    existingOpen.set(`${a.kind}|${subjectKey}`, a.id);
  }

  // ── Compute desired open set across both subject types ─────────────
  type Desired = {
    kind: AlertKind;
    member_id: string | null;
    task_id: string | null;
    reason: object;
  };
  const desired = new Map<string, Desired>();

  for (const m of members) {
    for (const a of detectAlertsForMember(m)) {
      desired.set(`${a.kind}|m:${m.id}`, {
        kind: a.kind,
        member_id: m.id,
        task_id: null,
        reason: a.reason,
      });
    }
  }
  for (const t of tasks) {
    const a = detectAlertForTask(t);
    if (a) {
      desired.set(`${a.kind}|t:${t.id}`, {
        kind: a.kind,
        member_id: null,
        task_id: t.id,
        reason: a.reason,
      });
    }
  }

  // ── Reconcile ───────────────────────────────────────────────────────
  const toInsert: Array<{
    kind: AlertKind;
    member_id: string | null;
    task_id: string | null;
    reason_json: object;
  }> = [];
  for (const [key, val] of desired) {
    if (!existingOpen.has(key)) {
      toInsert.push({
        kind: val.kind,
        member_id: val.member_id,
        task_id: val.task_id,
        reason_json: val.reason,
      });
    }
  }
  const toResolveIds: string[] = [];
  for (const [key, id] of existingOpen) {
    if (!desired.has(key)) toResolveIds.push(id);
  }

  let opened = 0;
  if (toInsert.length > 0) {
    const ins = await supabaseRest("crm_alerts", {
      method: "POST",
      body: JSON.stringify(toInsert),
      prefer: "return=minimal,resolution=ignore-duplicates",
    });
    if (ins.ok) opened = toInsert.length;
  }

  let resolved = 0;
  if (toResolveIds.length > 0) {
    const nowIso = new Date().toISOString();
    const res = await supabaseRest(
      `crm_alerts?id=in.(${toResolveIds.join(",")})`,
      {
        method: "PATCH",
        body: JSON.stringify({ resolved_at: nowIso }),
      },
    );
    if (res.ok) resolved = toResolveIds.length;
  }

  return NextResponse.json({
    ok: true,
    opened,
    resolved,
    total_open: desired.size,
    scanned: { members: members.length, tasks: tasks.length },
  });
}
