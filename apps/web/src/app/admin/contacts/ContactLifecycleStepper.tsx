"use client";

import { Fragment, memo, useMemo } from "react";

import {
  RESPONSE_KIND_LABELS,
  type Member,
  type ResponseKind,
} from "@/lib/members";

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
 * Reach-out lifecycle — five progression stages plus two off-pipeline
 * states. Heard back is one step with three answers (No / Maybe / Yes):
 *   1. first-reachout    — first outreach sent, awaiting reply
 *   2. second-reachout   — a follow-up went out, still awaiting reply
 *   3. heard-back        — they replied: no / maybe / yes (interested)
 *   4. agreements-sent   — membership agreement sent, awaiting signature
 *   5. member            — signed up as a GhostSignal member
 * Off-pipeline (surfaced in the filter, not counted as progress):
 *   - untouched → no outreach yet (default for freshly-imported rows)
 *   - stopped   → paused / churned
 *
 * Derived from existing Member fields:
 *   - phase paused/churned                 → stopped
 *   - became_member_at set OR phase run    → member
 *   - phase sign                           → agreements-sent
 *   - response_kind "interested"           → heard-interested
 *   - response_kind "maybe"                → heard-maybe
 *   - response_kind "no"                   → heard-no
 *   - lifecycle_steps.second_reachout done → second-reachout
 *   - first reach-out recorded             → first-reachout
 *   - otherwise                            → untouched
 *
 * The 1st-vs-2nd reach-out split rides in `lifecycle_steps` jsonb
 * (`first_reachout` / `second_reachout`). Heard-back answers live on
 * `response_kind` (`maybe` added in
 * docs/CRM_MEMBERS_RESPONSE_KIND_MAYBE_MIGRATION.sql).
 */
export type DerivedStatus =
  | "untouched"
  | "first-reachout"
  | "second-reachout"
  | "heard-no"
  | "heard-maybe"
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
  "heard-maybe",
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
  "heard-maybe": "Heard back — maybe",
  "heard-interested": "Heard back — yes",
  "agreements-sent": "Agreements sent",
  member: "Signed up as member",
  stopped: "Stopped",
};

/**
 * Progress rank — how far along the success path a contact is. Higher =
 * closer to "all steps succeeded" (member). Used by the Contacts list's
 * Lifecycle sort AND the stepper's done/current/upcoming paint.
 * Heard-back answers (no / maybe / yes) share rank 3 — they are
 * alternative replies, not sequential steps. Sort Yes/No/Maybe via
 * the Reply column instead.
 */
export const LIFECYCLE_RANK: Record<DerivedStatus, number> = {
  stopped: 0,
  untouched: 0,
  "first-reachout": 1,
  "second-reachout": 2,
  "heard-no": 3,
  "heard-maybe": 3,
  "heard-interested": 3,
  "agreements-sent": 4,
  member: 5,
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
  // Maybe is stored on lifecycle_steps.heard_maybe because the live
  // response_kind CHECK still rejects 'maybe'. Prefer the jsonb marker;
  // also honor response_kind if the CHECK is ever widened.
  if (
    m.response_kind === "maybe" ||
    m.lifecycle_steps?.heard_maybe?.status === "done"
  ) {
    return "heard-maybe";
  }
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
type TrafficTint = "neutral" | "warn" | "danger" | "success" | "info";

type HeardChoice = {
  kind: ResponseKind;
  label: string;
  target: DerivedStatus;
  tint: TrafficTint;
};

const HEARD_CHOICES: HeardChoice[] = [
  { kind: "no", label: RESPONSE_KIND_LABELS.no, target: "heard-no", tint: "danger" },
  { kind: "maybe", label: RESPONSE_KIND_LABELS.maybe, target: "heard-maybe", tint: "info" },
  { kind: "interested", label: RESPONSE_KIND_LABELS.interested, target: "heard-interested", tint: "success" },
];

type StepRow = {
  key: string;
  label: string;
  state: StepState;
  tint: TrafficTint;
  target: DerivedStatus | null;
  choices?: HeardChoice[];
};

/**
 * Five pipeline positions. Heard back is one circle with No / Maybe /
 * Yes choices underneath — those answers are alternatives, not extra
 * steps. `target` is the DerivedStatus a circle click sets; null on
 * Heard back because the pills own the selection.
 */
const STEP_TEMPLATE: Omit<StepRow, "state">[] = [
  { key: "first", label: "First reach out", tint: "warn", target: "first-reachout" },
  { key: "second", label: "2nd reach out", tint: "warn", target: "second-reachout" },
  { key: "heard", label: "Heard back", tint: "neutral", target: null, choices: HEARD_CHOICES },
  { key: "agreements", label: "Agreements sent", tint: "neutral", target: "agreements-sent" },
  { key: "member", label: "Signed up as member", tint: "success", target: "member" },
];

function heardTint(member: Member): TrafficTint {
  if (member.response_kind === "no") return "danger";
  if (
    member.response_kind === "maybe" ||
    member.lifecycle_steps?.heard_maybe?.status === "done"
  ) {
    return "info";
  }
  if (member.response_kind === "interested") return "success";
  return "neutral";
}

function heardBackLabel(status: DerivedStatus): string {
  if (status === "heard-no") return DERIVED_STATUS_LABELS["heard-no"];
  if (status === "heard-maybe") return DERIVED_STATUS_LABELS["heard-maybe"];
  if (status === "heard-interested") return DERIVED_STATUS_LABELS["heard-interested"];
  return "Heard back";
}

function stateFor(status: DerivedStatus, stepIndex: number): StepState {
  if (status === "untouched" || status === "stopped") return "upcoming";
  const stepRank = stepIndex + 1;
  const cur = LIFECYCLE_RANK[status];
  if (status === "member") return "done";
  if (stepRank === cur) return "current";
  if (stepRank < cur) return "done";
  return "upcoming";
}

function ContactLifecycleStepperImpl({ member, variant, onSetStatus }: Props) {
  const status = useMemo(() => deriveStatus(member), [member]);
  const isStopped = status === "stopped";
  const isMember = status === "member";

  const kindTint = heardTint(member);
  const rows: StepRow[] = useMemo(
    () =>
      STEP_TEMPLATE.map((s, i) => ({
        ...s,
        state: stateFor(status, i),
        label: s.key === "heard" ? heardBackLabel(status) : s.label,
        tint: s.key === "heard" ? kindTint : s.tint,
      })),
    [status, kindTint],
  );

  // "Done count" includes the current step so the X/5 progress pill
  // jumps from 0/5 (untouched) → 1/5 (First reach out) etc.
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
              <div
                className={[
                  styles.stepperFullStep,
                  row.choices ? styles.stepperFullStepHeard : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {onSetStatus && row.target ? (
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
                      onSetStatus(row.target!);
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
                {row.choices && onSetStatus ? (
                  <div
                    className={styles.heardChoices}
                    role="group"
                    aria-label="Heard back"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.choices.map((choice) => {
                      const active =
                        choice.kind === "maybe"
                          ? member.response_kind === "maybe" ||
                            member.lifecycle_steps?.heard_maybe?.status ===
                              "done"
                          : member.response_kind === choice.kind;
                      return (
                        <button
                          key={choice.kind}
                          type="button"
                          className={styles.heardChoice}
                          data-kind={choice.kind}
                          data-active={active ? "true" : "false"}
                          aria-pressed={active}
                          aria-label={
                            active
                              ? `Clear Heard back — ${choice.label}`
                              : `Heard back — ${choice.label}`
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetStatus(choice.target);
                          }}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
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
      next.member.lifecycle_steps?.second_reachout?.status &&
    prev.member.lifecycle_steps?.heard_maybe?.status ===
      next.member.lifecycle_steps?.heard_maybe?.status,
);
