/**
 * CRM alert types + detection logic.
 *
 * Three kinds today:
 *   contact_cold       — `members.last_contact_at` older than the
 *                        configured cold-threshold (default 28 days)
 *   marketplace_stall  — Sign/Onboard/Run phase, has incomplete
 *                        lifecycle steps, and `phase_entered_at`
 *                        older than the stall threshold (default 30d)
 *   task_stale         — Active (non-completed, non-archived) task
 *                        whose updated_at + latest_comment_at are
 *                        older than ALERT_TASK_STALE_DAYS (default 14d)
 *
 * Schema in docs/CRM_ALERTS_SCHEMA.sql + docs/CRM_ALERTS_TASKS_MIGRATION.sql.
 * Detection runs from the cron route at /api/admin/alerts/sync.
 * Auto-resolution fires inline when a comment is added or a
 * subject-row is patched.
 */

import { supabaseRest } from "@/lib/supabase-admin";
import {
  MARKETPLACE_LIFECYCLE_KEYS,
  type LifecycleSteps,
  type Member,
  type MemberOwner,
  type MemberPhase,
} from "@/lib/members";

export const ALERT_KINDS = [
  "contact_cold",
  "marketplace_stall",
  "task_stale",
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  contact_cold: "Contact gone cold",
  marketplace_stall: "Marketplace stalled",
  task_stale: "Task untouched",
};

/** Wire shape — mirrors the Supabase row. Exactly one of member_id /
 *  task_id is set (enforced by the DB subject-check). */
export type CrmAlert = {
  id: string;
  kind: AlertKind;
  member_id: string | null;
  task_id: string | null;
  triggered_at: string;
  resolved_at: string | null;
  snoozed_until: string | null;
  reason_json: AlertReason;
  created_at: string;
  updated_at: string;
};

/** Free-form context captured at detection time so the dropdown +
 *  digest can render a useful "why" without re-querying. */
export type AlertReason = {
  // member-side fields
  days_since_last_contact?: number;
  days_in_phase?: number;
  phase?: MemberPhase;
  incomplete_step_keys?: string[];
  // task-side fields
  days_since_update?: number;
  task_title?: string;
  task_priority?: "low" | "medium" | "high";
  task_status?: string;
};

/** Threshold knobs — read from env so the user can tune without code
 *  changes. Defaults: 28d contacts, 30d marketplace, 14d tasks. */
export function getThresholds() {
  const contactDays = Number(process.env.ALERT_CONTACT_COLD_DAYS ?? 28);
  const stallDays = Number(process.env.ALERT_MARKETPLACE_STALL_DAYS ?? 30);
  const taskDays = Number(process.env.ALERT_TASK_STALE_DAYS ?? 14);
  return {
    contactColdDays: Number.isFinite(contactDays) ? contactDays : 28,
    marketplaceStallDays: Number.isFinite(stallDays) ? stallDays : 30,
    taskStaleDays: Number.isFinite(taskDays) ? taskDays : 14,
  };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

/** Pick the most recent of a list of ISO timestamps. Used to fold
 *  task `updated_at` and `latest_comment_at` into one freshness
 *  signal. */
export function maxIso(
  ...iso: (string | null | undefined)[]
): string | null {
  let best = -Infinity;
  let pick: string | null = null;
  for (const s of iso) {
    if (!s) continue;
    const t = Date.parse(s);
    if (Number.isNaN(t)) continue;
    if (t > best) {
      best = t;
      pick = s;
    }
  }
  return pick;
}

/** Slim task shape the detector needs. Mirrors the design_tasks row +
 *  the derived `latest_comment_at` the GET handler attaches. */
export type StaleTaskCandidate = {
  id: string;
  title: string;
  status: string;
  priority: "low" | "medium" | "high";
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  latest_comment_at: string | null;
};

/** Are any marketplace-phase steps still open (todo/doing)? Skipped +
 *  na + done are all considered "settled". */
export function hasIncompleteMarketplaceSteps(
  steps: LifecycleSteps | null | undefined,
): { incomplete: boolean; keys: string[] } {
  if (!steps) return { incomplete: false, keys: [] };
  const open: string[] = [];
  for (const k of MARKETPLACE_LIFECYCLE_KEYS) {
    const s = steps[k];
    if (!s) continue;
    if (s.status === "todo" || s.status === "doing") open.push(k);
  }
  return { incomplete: open.length > 0, keys: open };
}

/** Pure: given one member, what alerts should be open right now? */
export function detectAlertsForMember(
  member: Member,
): { kind: AlertKind; reason: AlertReason }[] {
  const out: { kind: AlertKind; reason: AlertReason }[] = [];
  const { contactColdDays, marketplaceStallDays } = getThresholds();

  if (member.phase !== "paused" && member.phase !== "churned") {
    const reference = member.last_contact_at ?? member.created_at;
    const days = daysSince(reference);
    if (days !== null && days >= contactColdDays) {
      out.push({
        kind: "contact_cold",
        reason: { days_since_last_contact: days },
      });
    }
  }

  if (
    member.phase === "sign" ||
    member.phase === "onboard" ||
    member.phase === "run"
  ) {
    const { incomplete, keys } = hasIncompleteMarketplaceSteps(
      member.lifecycle_steps,
    );
    if (incomplete) {
      const reference = member.phase_entered_at ?? member.updated_at;
      const days = daysSince(reference);
      if (days !== null && days >= marketplaceStallDays) {
        out.push({
          kind: "marketplace_stall",
          reason: {
            days_in_phase: days,
            phase: member.phase,
            incomplete_step_keys: keys.slice(0, 5),
          },
        });
      }
    }
  }

  return out;
}

/** Pure: given one task, return a single task_stale alert reason or
 *  null when the task is fine. Tasks in `completed` / `archived` are
 *  never stale by definition. */
export function detectAlertForTask(
  task: StaleTaskCandidate,
): { kind: "task_stale"; reason: AlertReason } | null {
  if (task.status === "completed" || task.status === "archived") return null;
  const { taskStaleDays } = getThresholds();
  const freshness =
    maxIso(task.updated_at, task.latest_comment_at) ?? task.created_at;
  const days = daysSince(freshness);
  if (days === null || days < taskStaleDays) return null;
  return {
    kind: "task_stale",
    reason: {
      days_since_update: days,
      task_title: task.title,
      task_priority: task.priority,
      task_status: task.status,
    },
  };
}

/** Best-effort auto-resolve. Called from member PATCH + comment POST
 *  routes so the alert clears the moment a founder acts. */
export async function resolveOpenAlertsForMember(
  memberId: string,
  kinds?: AlertKind[],
): Promise<void> {
  try {
    const kindFilter = kinds && kinds.length > 0
      ? `&kind=in.(${kinds.join(",")})`
      : "";
    const path =
      `crm_alerts?member_id=eq.${memberId}` +
      `&resolved_at=is.null${kindFilter}`;
    const now = new Date().toISOString();
    await supabaseRest(path, {
      method: "PATCH",
      body: JSON.stringify({ resolved_at: now }),
    });
  } catch (err) {
    console.error("resolveOpenAlertsForMember failed", err);
  }
}

/** Same shape as the member helper but for task-side auto-resolution.
 *  Called from the design-tasks PATCH route + comments POST. */
export async function resolveOpenAlertsForTask(taskId: string): Promise<void> {
  try {
    const path =
      `crm_alerts?task_id=eq.${taskId}` +
      `&resolved_at=is.null&kind=eq.task_stale`;
    const now = new Date().toISOString();
    await supabaseRest(path, {
      method: "PATCH",
      body: JSON.stringify({ resolved_at: now }),
    });
  } catch (err) {
    console.error("resolveOpenAlertsForTask failed", err);
  }
}

/** Group alerts by owner for the per-owner digest. Members with no
 *  `owner` set land in the fallback bucket so they still get triaged. */
export function groupAlertsByOwner(
  alerts: (CrmAlert & { member: Pick<Member, "id" | "owner"> })[],
): Map<MemberOwner | "__fallback__", typeof alerts> {
  const groups = new Map<MemberOwner | "__fallback__", typeof alerts>();
  for (const a of alerts) {
    const key = (a.member.owner ?? "__fallback__") as MemberOwner | "__fallback__";
    const arr = groups.get(key) ?? [];
    arr.push(a);
    groups.set(key, arr);
  }
  return groups;
}
