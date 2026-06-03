"use client";

import { Fragment, memo, useMemo } from "react";

import type { Member } from "@/lib/members";

import styles from "./contacts.module.css";

type Props = {
  member: Member;
  variant: "full" | "compact";
  /** Optional click-to-set handler. When provided on the `full` variant,
   *  each circle becomes a button that sets the member's lifecycle
   *  status to the clicked step. The parent translates the
   *  `DerivedStatus` into a Member PATCH (phase / became_member_at /
   *  last_contact_at / last_response). Omit to render read-only. */
  onSetStatus?: (next: DerivedStatus) => void;
};

/**
 * Four overall statuses for a contact: Discern → Courting → Member,
 * plus Stopped as a separate off-pipeline state. The Courting phase
 * has three sub-steps tracking outreach progress (no contact, made
 * but no reply, replied).
 *
 * All five circle positions are derived from existing Member fields:
 *   - phase = "paused" or "churned" → Stopped (stepper greys out)
 *   - became_member_at != null OR phase in {sign,onboard,run} → Member
 *   - phase = "discern" → Discern is current
 *   - phase = "court" + neither last_contact_at nor last_response set
 *     → Courting sub-1 (no contact established)
 *   - phase = "court" + last_contact_at set, last_response null
 *     → Courting sub-2 (contact made, no reply)
 *   - phase = "court" + last_response set
 *     → Courting sub-3 (replied)
 *
 * Read-only in v1: the existing edit modal + PipelineCard control all
 * three underlying fields. Click-to-advance can land in a follow-up.
 */

/**
 * Traffic-light statuses (Jack's v2 spec, 2026-06-03):
 *   0. untouched           — no explicit lifecycle action taken yet
 *                             (the default for newly-imported rows)
 *   1. discern             — pipeline entry; no contact attempted yet
 *   2. reached-out         — first outreach happened, awaiting reply
 *   3. replied-no          — they responded with a "no" / not interested
 *   4. replied-interested  — they responded positively
 * Plus two non-stepper states that still flow through the derivation
 * so the filter dropdown can surface them:
 *   - member  → graduated (set via the "become a member" button below
 *               the stepper, or any post-court phase)
 *   - stopped → off-pipeline (paused / churned)
 *
 * The discriminator between `untouched` and `discern` is
 * `lifecycle_steps.discernment.status === "done"` — set when the
 * founder explicitly clicks any traffic-light circle (handled in
 * page.tsx's `statusToPatch`). Without that marker we can't tell a
 * brand-new row (phase defaults to "discern" at insert) from one the
 * founder has actually triaged.
 */
export type DerivedStatus =
  | "untouched"
  | "discern"
  | "reached-out"
  | "replied-no"
  | "replied-interested"
  | "member"
  | "stopped";

/** Canonical list of statuses in lifecycle order — used by the filter
 *  dropdown so the option order mirrors the stepper left-to-right. */
export const DERIVED_STATUSES: readonly DerivedStatus[] = [
  "untouched",
  "discern",
  "reached-out",
  "replied-no",
  "replied-interested",
  "member",
  "stopped",
] as const;

/** Human labels for the filter dropdown. */
export const DERIVED_STATUS_LABELS: Record<DerivedStatus, string> = {
  untouched: "Not started",
  discern: "Discern",
  "reached-out": "Reached out",
  "replied-no": "Replied — no",
  "replied-interested": "Replied — interested",
  member: "Member",
  stopped: "Stopped",
};

/** True when the founder has explicitly engaged with this contact via
 *  the traffic-light stepper. Any forward-of-discern signal counts
 *  (court phase, contact recorded, reply categorised, graduated) plus
 *  the explicit `discernment` checkpoint that the stepper sets on
 *  every click. Used to distinguish "Discern clicked" (state: discern)
 *  from "no action yet" (state: untouched). */
function isLifecycleStarted(m: Member): boolean {
  if (m.lifecycle_steps?.discernment?.status === "done") return true;
  if (m.phase !== "discern") return true;
  if (m.last_contact_at) return true;
  if (m.response_kind) return true;
  if (m.became_member_at) return true;
  return false;
}

export function deriveStatus(m: Member): DerivedStatus {
  if (m.phase === "paused" || m.phase === "churned") return "stopped";
  if (m.became_member_at) return "member";
  if (
    m.phase === "sign" ||
    m.phase === "onboard" ||
    m.phase === "run"
  ) {
    return "member";
  }
  if (m.phase === "court") {
    // `response_kind` is the authoritative traffic-light signal. The
    // free-text `last_response` is still allowed alongside it (founders
    // capture the actual words there) but is no longer consulted for
    // status derivation — too easy to misclassify "they said no but
    // want to chat in Q3" as either bucket.
    if (m.response_kind === "no") return "replied-no";
    if (m.response_kind === "interested") return "replied-interested";
    return "reached-out";
  }
  // phase === "discern" — explicit click vs untouched row.
  return isLifecycleStarted(m) ? "discern" : "untouched";
}

type StepState = "done" | "current" | "upcoming";

/**
 * Traffic-light tint applied to a circle. Drives the CSS color choice:
 *   - neutral     (discern)        — gray, pipeline entry
 *   - warn        (reached out)    — yellow, awaiting reply
 *   - danger      (replied no)     — red, rejected
 *   - success     (replied interested) — green, positive
 */
type TrafficTint = "neutral" | "warn" | "danger" | "success";

type StepRow = {
  key: string;
  label: string;
  state: StepState;
  tint: TrafficTint;
  target: DerivedStatus;
};

/**
 * The four traffic-light positions, in lifecycle order. State
 * (done/current/upcoming) is filled in per render based on the derived
 * status. The `target` field is the DerivedStatus that clicking the
 * circle should set the member to — consumed by the parent's
 * onSetStatus callback. `tint` drives the traffic-light color.
 *
 * Replied-no and replied-interested are mutually-exclusive outcomes of
 * the same upstream event (the reply itself), not sequential steps —
 * see `stateFor` for how that's reflected in done/current/upcoming.
 */
const STEP_TEMPLATE: (Omit<StepRow, "state">)[] = [
  { key: "discern",     label: "Discern",            tint: "neutral", target: "discern" },
  { key: "reached-out", label: "Reached out",        tint: "warn",    target: "reached-out" },
  { key: "no",          label: "Replied — no",       tint: "danger",  target: "replied-no" },
  { key: "interested",  label: "Replied — interested", tint: "success", target: "replied-interested" },
];

function stateFor(status: DerivedStatus, stepIndex: number): StepState {
  // Untouched + stopped = all circles upcoming (hollow). Counts as 0/4.
  if (status === "untouched" || status === "stopped") return "upcoming";
  // Graduated members: discern + reached-out + one of the reply
  // outcomes are all consumed history — paint them all done.
  if (status === "member") return "done";

  switch (status) {
    case "discern":
      // Only discern is current; everything to its right is upcoming.
      return stepIndex === 0 ? "current" : "upcoming";
    case "reached-out":
      // Discern done, reached-out current, both reply outcomes are
      // still pending alternatives.
      if (stepIndex === 0) return "done";
      if (stepIndex === 1) return "current";
      return "upcoming";
    case "replied-no":
      // Discern + reached-out happened; "no" is current; interested
      // is the alternative outcome that didn't occur.
      if (stepIndex === 0 || stepIndex === 1) return "done";
      if (stepIndex === 2) return "current";
      return "upcoming";
    case "replied-interested":
      // Same as above but mirrored — interested is current, no is the
      // alternative that didn't occur. We deliberately don't mark "no"
      // as done; only earned positions are done.
      if (stepIndex === 0 || stepIndex === 1) return "done";
      if (stepIndex === 3) return "current";
      return "upcoming";
  }
}

function ContactLifecycleStepperImpl({ member, variant, onSetStatus }: Props) {
  const status = useMemo(() => deriveStatus(member), [member]);
  const isStopped = status === "stopped";
  const isMember = status === "member";

  const rows: StepRow[] = useMemo(
    () =>
      STEP_TEMPLATE.map((s, i) => ({
        ...s,
        state: stateFor(status, i),
      })),
    [status],
  );

  // "Done count" includes the current step so the X/4 progress pill
  // jumps from 0/4 (untouched) → 1/4 (Discern clicked) → 2/4 (Reached
  // out current) etc. — matches the visible filled-circle count.
  const doneCount = rows.filter(
    (r) => r.state === "done" || r.state === "current",
  ).length;
  const totalCount = rows.length;
  const currentRow = rows.find((r) => r.state === "current") ?? null;

  if (variant === "compact") {
    return (
      <div
        className={[
          styles.stepperCompact,
          isStopped ? styles.stepperCompactStopped : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={
          isStopped
            ? "Lifecycle: stopped"
            : `Lifecycle: ${doneCount} of ${totalCount} complete`
        }
      >
        <div className={styles.stepperCompactBar}>
          {rows.map((row) => (
            <span
              key={row.key}
              className={[
                styles.stepperCompactPip,
                row.state === "done" ? styles.stepperCompactPipDone : "",
                row.state === "current" ? styles.stepperCompactPipCurrent : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-tint={row.tint}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className={styles.stepperCompactLabel}>
          {isStopped ? (
            <span className={styles.stepperCompactStopped}>Stopped</span>
          ) : isMember ? (
            <span className={styles.stepperCompactComplete}>Member</span>
          ) : (
            <>
              <span className={styles.stepperCompactProgress}>
                {doneCount}/{totalCount}
              </span>
              <span className={styles.stepperCompactStepLabel}>
                · {currentRow ? currentRow.label : "Not started"}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Full variant — traffic-light row ----
  return (
    <section
      className={[
        styles.stepperFull,
        isStopped ? styles.stepperFullStopped : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Contact lifecycle"
    >
      <header className={styles.stepperFullHeader}>
        <div className={styles.stepperFullHeaderText}>
          <h4 className={styles.stepperFullTitle}>Lifecycle</h4>
          <p className={styles.stepperFullSummary}>
            {isStopped ? (
              <span className={styles.stepperFullSummaryStopped}>
                This contact is off-pipeline. Reactivate by changing the
                phase from Paused / Churned in the Pipeline card.
              </span>
            ) : isMember ? (
              <span className={styles.stepperFullSummaryComplete}>
                Graduated to GhostSignal member — full lifecycle continues
                on the marketplace pool.
              </span>
            ) : currentRow ? (
              <strong>{currentRow.label}</strong>
            ) : (
              <span className={styles.stepperFullSummaryStopped}>
                Not started — click a circle to triage this contact.
              </span>
            )}
          </p>
        </div>
        {isStopped ? (
          <span className={styles.stepperFullStoppedPill}>Stopped</span>
        ) : isMember ? (
          <span
            className={`${styles.stepperFullPill} ${styles.stepperFullPillFull}`}
          >
            Member
          </span>
        ) : null}
      </header>

      <div className={styles.stepperFullRow}>
        {rows.map((row, i) => {
          const isDone = row.state === "done";
          const isCurrent = row.state === "current";
          const prevDone = i > 0 && rows[i - 1].state === "done";
          const circleCls = [
            styles.stepperFullCircle,
            onSetStatus ? styles.stepperFullCircleClickable : "",
            isDone ? styles.stepperFullCircleDone : "",
            isCurrent ? styles.stepperFullCircleCurrent : "",
          ]
            .filter(Boolean)
            .join(" ");
          // Tint is the traffic-light color identity — same regardless
          // of state so the row reads as a four-light sequence at a
          // glance even when the contact is mid-flow.
          const tintAttr = { "data-tint": row.tint } as const;
          return (
            <Fragment key={row.key}>
              {i > 0 && (
                <span
                  className={[
                    styles.stepperFullConnector,
                    prevDone ? styles.stepperFullConnectorActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
              )}
              <div className={styles.stepperFullStep}>
                {onSetStatus ? (
                  <button
                    type="button"
                    className={circleCls}
                    {...tintAttr}
                    aria-label={`Set lifecycle to ${row.label}`}
                    title={`Click to set status: ${row.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetStatus(row.target);
                    }}
                  >
                    {isDone || isCurrent ? "✓" : ""}
                  </button>
                ) : (
                  <div
                    className={circleCls}
                    {...tintAttr}
                    aria-label={`${row.label} — ${row.state}`}
                    title={row.label}
                  >
                    {isDone || isCurrent ? "✓" : ""}
                  </div>
                )}
                <div className={styles.stepperFullStepLabel}>{row.label}</div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Memoized export. Compares only the fields the stepper actually reads,
 * so the compact variant in every visible row of /admin/contacts (200+
 * rows) doesn't re-render when unrelated state changes (e.g. expanding
 * a single row, or any save echo on a different member). This is the
 * main perf lever for the contacts table — without it, expanding a row
 * causes a full restripe of every compact stepper in the table.
 */
export const ContactLifecycleStepper = memo(
  ContactLifecycleStepperImpl,
  (prev, next) =>
    prev.variant === next.variant &&
    prev.onSetStatus === next.onSetStatus &&
    prev.member.phase === next.member.phase &&
    prev.member.became_member_at === next.member.became_member_at &&
    prev.member.last_contact_at === next.member.last_contact_at &&
    prev.member.response_kind === next.member.response_kind &&
    // The discernment step status discriminates untouched vs Discern;
    // include it so the stepper restripes when the founder clicks the
    // first circle and the underlying marker flips to "done".
    prev.member.lifecycle_steps?.discernment?.status ===
      next.member.lifecycle_steps?.discernment?.status,
);
