"use client";

import { Fragment, useMemo } from "react";

import {
  LIFECYCLE_STEPS,
  MARKETPLACE_LIFECYCLE_KEYS,
  MEMBER_PHASE_LABELS,
  type LifecycleSteps,
  type Member,
  type MemberPhase,
  type StepStatus,
} from "@/lib/members";

import styles from "./marketplace.module.css";

type Props = {
  member: Member;
  variant: "full" | "compact";
  /** Full variant only — clicking a circle toggles its done state. */
  onToggle?: (stepKey: string, nextDone: boolean) => void | Promise<void>;
};

const PHASE_ORDER: MemberPhase[] = ["sign", "onboard", "run"];

function getEffectiveStatus(
  steps: LifecycleSteps | null | undefined,
  stepKey: string,
  isNa: boolean,
): StepStatus {
  if (isNa) return "na";
  return steps?.[stepKey]?.status ?? "todo";
}

type StepRow = {
  step: (typeof LIFECYCLE_STEPS)[number];
  status: StepStatus;
  isNa: boolean;
};

/**
 * Horizontal lifecycle stepper used in two places on the marketplace
 * pool: a compact pip-bar in the table's "Next action" column, and the
 * full Stripe/Material-style stepper at the top of the expanded panel.
 *
 * Step set is the marketplace slice (Sign + Onboard + Run = 7 steps).
 * For brand members, creator-only steps render as `na` and don't count
 * toward progress — matches the same logic in `countCompleted`.
 *
 * "Current" is derived: the first non-done, non-na step (or `null`
 * once everything is complete). Stored `status: "doing"` is treated as
 * current too if explicitly set, but the existing toggle UI only writes
 * "done" / "todo", so this is forward-compatible plumbing.
 */
export function LifecycleStepper({ member, variant, onToggle }: Props) {
  const stepData: StepRow[] = useMemo(() => {
    const stepKeys = new Set(MARKETPLACE_LIFECYCLE_KEYS);
    return LIFECYCLE_STEPS.filter((s) => stepKeys.has(s.key)).map((step) => {
      const isNa = !!step.creatorOnly && member.member_type !== "creator";
      // Auto-derive xq_completed from members.xq_submission_id — once
      // the public /xq-quiz POST links the submission back to a member
      // by email, the quiz is functionally "done" without anyone
      // ticking a checkbox. (rq_completed will get the same treatment
      // when rq_submission_id auto-linking lands; tracked in the
      // session log.)
      if (step.key === "xq_completed" && member.xq_submission_id && !isNa) {
        return { step, status: "done" as StepStatus, isNa };
      }
      const status = getEffectiveStatus(
        member.lifecycle_steps,
        step.key,
        isNa,
      );
      return { step, status, isNa };
    });
  }, [member.lifecycle_steps, member.member_type, member.xq_submission_id]);

  const applicable = stepData.filter((s) => !s.isNa);
  const done = applicable.filter((s) => s.status === "done").length;
  const total = applicable.length;
  const isComplete = total > 0 && done === total;

  const currentRow = useMemo(() => {
    const explicit = stepData.find((s) => s.status === "doing");
    if (explicit) return explicit;
    return stepData.find((s) => s.status !== "done" && s.status !== "na");
  }, [stepData]);
  const currentKey = currentRow?.step.key;
  const currentIndex = currentRow
    ? stepData.findIndex((s) => s.step.key === currentRow.step.key)
    : -1;

  // Phase groups for the full variant — hoisted above the compact
  // early-return so the hook order stays stable across both variants.
  const phaseGroups = useMemo(() => {
    const groups: { phase: MemberPhase; steps: StepRow[] }[] = [];
    for (const phase of PHASE_ORDER) {
      const steps = stepData.filter((s) => s.step.phase === phase);
      if (steps.length > 0) groups.push({ phase, steps });
    }
    return groups;
  }, [stepData]);

  if (variant === "compact") {
    return (
      <div
        className={styles.stepperCompact}
        aria-label={`Lifecycle progress: ${done} of ${total} steps`}
      >
        <div className={styles.stepperCompactBar}>
          {stepData.map(({ step, status, isNa }) => {
            const isCurrent = !isComplete && step.key === currentKey;
            return (
              <span
                key={step.key}
                className={[
                  styles.stepperCompactPip,
                  status === "done" ? styles.stepperCompactPipDone : "",
                  isCurrent ? styles.stepperCompactPipCurrent : "",
                  isNa ? styles.stepperCompactPipNa : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />
            );
          })}
        </div>
        <div className={styles.stepperCompactLabel}>
          <span className={styles.stepperCompactProgress}>
            {done}/{total}
          </span>
          {isComplete ? (
            <span className={styles.stepperCompactComplete}>· Complete</span>
          ) : currentRow ? (
            <>
              <span className={styles.stepperCompactPhase}>
                · {MEMBER_PHASE_LABELS[currentRow.step.phase]}
              </span>
              <span className={styles.stepperCompactStepLabel}>
                · {currentRow.step.label}
              </span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // ---- Full variant ----

  async function handleClick(stepKey: string, currentStatus: StepStatus) {
    if (!onToggle) return;
    if (currentStatus === "na") return;
    const nextDone = currentStatus !== "done";
    await onToggle(stepKey, nextDone);
  }

  return (
    <section className={styles.stepperFull} aria-label="Lifecycle">
      <header className={styles.stepperFullHeader}>
        <div className={styles.stepperFullHeaderText}>
          <h4 className={styles.stepperFullTitle}>Lifecycle</h4>
          <p className={styles.stepperFullSummary}>
            {isComplete ? (
              <span className={styles.stepperFullSummaryComplete}>
                All {total} steps complete
              </span>
            ) : currentRow ? (
              <>
                <strong>
                  Step {currentIndex + 1} of {total}
                </strong>
                {" — "}
                {currentRow.step.label}
                <span className={styles.stepperFullSummaryRole}>
                  {" · "}
                  {currentRow.step.ownerRole}
                </span>
              </>
            ) : (
              <>No applicable steps</>
            )}
          </p>
        </div>
        <span
          className={[
            styles.stepperFullPill,
            isComplete ? styles.stepperFullPillFull : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {done}/{total}
        </span>
      </header>

      <div className={styles.stepperFullRow}>
        {phaseGroups.map((group, gi) => (
          <Fragment key={group.phase}>
            {gi > 0 && (
              <span
                className={styles.stepperFullPhaseGap}
                aria-hidden="true"
              />
            )}
            <div
              className={styles.stepperFullPhase}
              data-phase={group.phase}
            >
              <div className={styles.stepperFullPhaseHeader}>
                {MEMBER_PHASE_LABELS[group.phase]}
              </div>
              <div className={styles.stepperFullPhaseSteps}>
                {group.steps.map((row, i) => {
                  const isDone = row.status === "done";
                  const isCurrent =
                    !isComplete && row.step.key === currentKey;
                  const prevDone = i > 0 && group.steps[i - 1].status === "done";
                  return (
                    <Fragment key={row.step.key}>
                      {i > 0 && (
                        <span
                          className={[
                            styles.stepperFullConnector,
                            prevDone
                              ? styles.stepperFullConnectorActive
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden="true"
                        />
                      )}
                      <div className={styles.stepperFullStep}>
                        <button
                          type="button"
                          className={[
                            styles.stepperFullCircle,
                            isDone ? styles.stepperFullCircleDone : "",
                            isCurrent
                              ? styles.stepperFullCircleCurrent
                              : "",
                            row.isNa ? styles.stepperFullCircleNa : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            void handleClick(row.step.key, row.status)
                          }
                          disabled={row.isNa || !onToggle}
                          aria-label={`${row.step.label} — ${
                            row.isNa
                              ? "not applicable"
                              : isDone
                                ? "done, click to undo"
                                : "click to mark done"
                          }`}
                          title={`${row.step.label} (${row.step.ownerRole})${
                            row.isNa ? " — N/A for this member" : ""
                          }`}
                        >
                          {isDone ? "✓" : row.isNa ? "—" : ""}
                        </button>
                        <div className={styles.stepperFullStepLabel}>
                          {row.step.label}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
