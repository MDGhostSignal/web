/**
 * CRM alert types + detection logic.
 *
 * Two kinds today:
 *   contact_cold       — `members.last_contact_at` older than the
 *                        configured cold-threshold (default 28 days)
 *   marketplace_stall  — Sign/Onboard/Run phase, has incomplete
 *                        lifecycle steps, and `phase_entered_at`
 *                        older than the stall threshold (default 30d)
 *
 * Schema in docs/CRM_ALERTS_SCHEMA.sql. Detection runs from the cron
 * route at /api/admin/alerts/sync. Auto-resolution also fires inline
 * when a comment is added or last_contact_at / lifecycle_steps changes.
 */

import { supabaseRest } from "@/lib/supabase-admin";
import {
  MARKETPLACE_LIFECYCLE_KEYS,
  type LifecycleSteps,
  type Member,
  type MemberOwner,
  type MemberPhase,
} from "@/lib/members";

export const ALERT_KINDS = ["contact_cold", "marketplace_stall"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  contact_cold: "Contact gone cold",
  marketplace_stall: "Marketplace stalled",
};

/** Wire shape — mirrors the Supabase row. */
export type CrmAlert = {
  id: string;
  kind: AlertKind;
  member_id: string;
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
  days_since_last_contact?: number;
  days_in_phase?: number;
  phase?: MemberPhase;
  incomplete_step_keys?: string[];
};

/** Threshold knobs — read from env so the user can tune without code
 *  changes. Defaults come from the alerts UX spec confirmed with the
 *  user (28d contacts, 30d marketplace). */
export function getThresholds() {
  const contactDays = Number(process.env.ALERT_CONTACT_COLD_DAYS ?? 28);
  const stallDays = Number(process.env.ALERT_MARKETPLACE_STALL_DAYS ?? 30);
  return {
    contactColdDays: Number.isFinite(contactDays) ? contactDays : 28,
    marketplaceStallDays: Number.isFinite(stallDays) ? stallDays : 30,
  };
}

/** ms in one day — used by daysBetween below. */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

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

/** Pure: given one member, what alerts should be open right now? Used
 *  by the sync cron to compute the desired state, then reconciled
 *  against existing rows in `crm_alerts`. */
export function detectAlertsForMember(
  member: Member,
): { kind: AlertKind; reason: AlertReason }[] {
  const out: { kind: AlertKind; reason: AlertReason }[] = [];
  const { contactColdDays, marketplaceStallDays } = getThresholds();

  // contact_cold — applies to everyone in active pipeline (not paused /
  // churned). Members who never had a logged contact still qualify if
  // they were created more than `contactColdDays` ago (we fall back to
  // created_at when last_contact_at is null).
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

  // marketplace_stall — only for Sign/Onboard/Run members who still
  // have open lifecycle steps. phase_entered_at is the timer because a
  // recent phase-flip means progress was just made.
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

/** Best-effort auto-resolve. Called from member PATCH + comment POST
 *  routes so the alert clears the moment a founder acts. Never throws
 *  — failure here is logged but doesn't break the parent request. */
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

/** Group alerts by owner for the per-owner digest. Members with no
 *  `owner` set land in the fallback bucket so they still get triaged
 *  rather than vanishing. */
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
