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
 * Six-stage reach-out lifecycle for a contact, plus two off-pipeline
 * states (untouched / stopped). All positions derive from existing
 * Member fields — see `deriveStatus` below for the exact mapping. The
 * circles are click-to-set on the `full` variant (the parent translates
 * a clicked stage into a Member PATCH via `statusToPatch`).
 */

/**
 * Reach-out lifecycle (Martin's 2026-08-07 spec) — six progression
 * stages plus two off-pipeline states:
 *   1. first-reachout    — first outreach sent, awaiting reply
 *   2. second-reachout   — a follow-up went out, still awaiting reply
 *   3. heard-no          — they replied "no" / not interested (dead-end)
 *   4. heard-interested  — they replied positively
 *   5. agreements-sent   — membership agreement sent, awaiting signature
 *   6. member            — signed up as a GhostSignal member
 * Off-pipeline (surfaced in the filter, not counted as progress):
 *   - untouched → no outreach yet (default for freshly-imported rows)
 *   - stopped   → paused / churned
 *
 * Derived from existing Member fields — no schema change:
 *   - phase paused/churned                 → stopped
 *   - became_member_at set OR phase run    → member
 *   - phase sign                           → agreements-sent
 *   - response_kind "interested"           → heard-interested
 *   - response_kind "no"                   → heard-no
 *   - lifecycle_steps.second_reachout done → second-reachout
 *   - first reach-out recorded             → first-reachout
 *   - otherwise                            → untouched
 *
 * The 1st-vs-2nd reach-out split is the one genuinely new bit of state;
 * it rides in the free-form `lifecycle_steps` jsonb (keys
 * `first_reachout` / `second_reachout`) so no migration is needed. The
 * marketplace stepper ignores keys outside its own catalog.
 */
export type DerivedStatus =
  | "untouched"
  | "first-reachout"
  | "second-reachout"
  | "heard-no"
  | "heard-interested"
  | "agreements-sent"
  | "member"
  | "stopped";

/** Canonical list of statuses in lifecycle order — used by the filter
 *  dropdown so the option order mirrors the stepper left-to-right. */
export const DERIVED_STATUSES: readonly DerivedStatus[] = [
  "untouched",
  "first-reachout",
  "second-reachout",
  "heard-no",
  "heard-interested",
  "agreements-sent",
  "member",
  "stopped",
] as const;

/** Human labels for the filter dropdown. */
export const DERIVED_STATUS_LABELS: Record<DerivedStatus, string> = {
  untouched: "Not started",
  "first-reachout": "First reach out",
  "second-reachout": "2nd reach out",
  "heard-no": "Heard back — no",
  "heard-interested": "Heard back — interested",
  "agreements-sent": "Agreements sent",
  member: "Signed up as member",
  stopped: "Stopped",
};

/**
 * Progress rank — how far along the success path a contact is. Higher =
 * closer to "all steps succeeded" (member). Used by the Contacts list's
 * Lifecycle sort. Off-pipeline states sort to the bottom: `stopped` and
 * `untouched` are 0 so they trail every contact that has real progress.
 */
export const LIFECYCLE_RANK: Record<DerivedStatus, number> = {
  stopped: 0,
  untouched: 0,
  "first-reachout": 1,
  "second-reachout": 2,
  "heard-no": 3,
  "heard-interested": 4,
  "agreements-sent": 5,
  member: 6,
};

/** True once a first reach-out has been recorded for this contact —
 *  either an explicit `first_reachout` marker, a logged contact date, or
 *  the contact having advanced past the initial `discern` phase. */
function hasFirstReachout(m: Member): boolean {
  if (m.lifecycle_steps?.first_reachout?.status === "done") return true;
  if (m.last_contact_at) return true;
  if (m.phase === "court") return true;
  return false;
}

export function deriveStatus(m: Member): DerivedStatus {
  if (m.phase === "paused" || m.phase === "churned") return "stopped";
  if (m.became_member_at || m.phase === "run" || m.phase === "onboard") {
    return "member";
  }
  if (m.phase === "sign") return "agreements-sent";
  // `response_kind` is the authoritative reply signal; free-text
  // `last_response` stays for the founder's actual words but isn't
  // consulted here (too easy to misclassify).
  if (m.response_kind === "interested") return "heard-interested";
  if (m.response_kind === "no") return "heard-no";
  if (m.lifecycle_steps?.second_reachout?.status === "done") {
    return "second-reachout";
  }
  if (hasFirstReachout(m)) return "first-reachout";
  return "untouched";
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
  { key: "first",      label: "First reach out",        tint: "warn",    target: "first-reachout" },
  { key: "second",     label: "2nd reach out",          tint: "warn",    target: "second-reachout" },
  { key: "no",         label: "Heard back — no",        tint: "danger",  target: "heard-no" },
  { key: "interested", label: "Heard back — interested", tint: "success", target: "heard-interested" },
  { key: "agreements", label: "Agreements sent",        tint: "neutral", target: "agreements-sent" },
  { key: "member",     label: "Signed up as member",    tint: "success", target: "member" },
];

function stateFor(status: DerivedStatus, stepIndex: number): StepState {
  // Untouched + stopped = all circles upcoming (hollow). Counts as 0/6.
  if (status === "untouched" || status === "stopped") return "upcoming";

  // Step ranks map 1:1 to STEP_TEMPLATE order (first=1 … member=6),
  // matching LIFECYCLE_RANK. `cur` is how far this contact has advanced.
  const stepRank = stepIndex + 1;
  const cur = LIFECYCLE_RANK[status];

  // "Heard back — no" (rank 3) is the alternative outcome to
  // "interested" — only paint it when the contact actually went that
  // route. Anyone who progressed past the reply (rank ≥ 4) never took it.
  if (stepRank === 3 && cur >= 4) return "upcoming";

  // Graduated members: every earned position is consumed history.
  if (status === "member") return "done";

  if (stepRank === cur) return "current";
  if (stepRank < cur) return "done";
  return "upcoming";
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
                    aria-label={
                      status === row.target && row.target === "first-reachout"
                        ? `Clear ${row.label}`
                        : `Set lifecycle to ${row.label}`
                    }
                    title={
                      status === row.target && row.target === "first-reachout"
                        ? `Click to clear: ${row.label}`
                        : `Click to set status: ${row.label}`
                    }
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
    // The reach-out markers drive the 1st-vs-2nd distinction; include
    // them so the stepper restripes when the founder clicks a reach-out
    // circle and the underlying jsonb marker flips to "done".
    prev.member.lifecycle_steps?.first_reachout?.status ===
      next.member.lifecycle_steps?.first_reachout?.status &&
    prev.member.lifecycle_steps?.second_reachout?.status ===
      next.member.lifecycle_steps?.second_reachout?.status,
);
