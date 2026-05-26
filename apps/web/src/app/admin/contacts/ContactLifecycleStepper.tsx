"use client";

import { Fragment, useMemo } from "react";

import type { Member } from "@/lib/members";

import styles from "./contacts.module.css";

type Props = {
  member: Member;
  variant: "full" | "compact";
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

type DerivedStatus =
  | "discern"
  | "courting-no-contact"
  | "courting-no-reply"
  | "courting-replied"
  | "member"
  | "stopped";

function deriveStatus(m: Member): DerivedStatus {
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
    if (m.last_response && m.last_response.trim().length > 0) {
      return "courting-replied";
    }
    if (m.last_contact_at) return "courting-no-reply";
    return "courting-no-contact";
  }
  return "discern";
}

type StepState = "done" | "current" | "upcoming";

type StepRow = {
  key: string;
  label: string;
  phase: "discern" | "courting" | "member";
  state: StepState;
};

const PHASE_LABELS: Record<"discern" | "courting" | "member", string> = {
  discern: "Discern",
  courting: "Courting",
  member: "Member",
};

/**
 * The five circle positions, in lifecycle order. State (done/current/
 * upcoming) is filled in per render based on the derived status.
 */
const STEP_TEMPLATE: Omit<StepRow, "state">[] = [
  { key: "discern", label: "Discern", phase: "discern" },
  { key: "no-contact", label: "No contact established", phase: "courting" },
  { key: "no-reply", label: "Contact made, no reply", phase: "courting" },
  { key: "replied", label: "Replied", phase: "courting" },
  { key: "member", label: "Member", phase: "member" },
];

function stateFor(status: DerivedStatus, stepIndex: number): StepState {
  if (status === "stopped") return "upcoming";
  if (status === "member") return "done";

  // Map current status → currentIndex into the 5-step template.
  const currentIndex = (() => {
    switch (status) {
      case "discern":
        return 0;
      case "courting-no-contact":
        return 1;
      case "courting-no-reply":
        return 2;
      case "courting-replied":
        return 3;
    }
  })();

  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

export function ContactLifecycleStepper({ member, variant }: Props) {
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

  const doneCount = rows.filter((r) => r.state === "done").length;
  const totalCount = rows.length;
  const currentRow = rows.find((r) => r.state === "current") ?? null;

  // Phase groups for the full variant — always 3 groups in fixed order.
  const phaseGroups = useMemo(() => {
    return (["discern", "courting", "member"] as const).map((phase) => ({
      phase,
      label: PHASE_LABELS[phase],
      steps: rows.filter((r) => r.phase === phase),
    }));
  }, [rows]);

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
              aria-hidden="true"
            />
          ))}
        </div>
        <div className={styles.stepperCompactLabel}>
          {isStopped ? (
            <span className={styles.stepperCompactStopped}>Stopped</span>
          ) : isMember ? (
            <span className={styles.stepperCompactComplete}>Member</span>
          ) : currentRow ? (
            <>
              <span className={styles.stepperCompactProgress}>
                {doneCount}/{totalCount}
              </span>
              <span className={styles.stepperCompactPhase}>
                · {PHASE_LABELS[currentRow.phase]}
              </span>
              <span className={styles.stepperCompactStepLabel}>
                · {currentRow.label}
              </span>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // ---- Full variant ----
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
              <>
                <strong>{PHASE_LABELS[currentRow.phase]}</strong>
                {" — "}
                {currentRow.label}
              </>
            ) : null}
          </p>
        </div>
        {isStopped ? (
          <span className={styles.stepperFullStoppedPill}>Stopped</span>
        ) : (
          <span
            className={[
              styles.stepperFullPill,
              isMember ? styles.stepperFullPillFull : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {doneCount}/{totalCount}
          </span>
        )}
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
                {group.label}
              </div>
              <div className={styles.stepperFullPhaseSteps}>
                {group.steps.map((row, i) => {
                  const isDone = row.state === "done";
                  const isCurrent = row.state === "current";
                  const prevDone =
                    i > 0 && group.steps[i - 1].state === "done";
                  return (
                    <Fragment key={row.key}>
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
                        <div
                          className={[
                            styles.stepperFullCircle,
                            isDone ? styles.stepperFullCircleDone : "",
                            isCurrent
                              ? styles.stepperFullCircleCurrent
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-label={`${row.label} — ${row.state}`}
                          title={row.label}
                        >
                          {isDone ? "✓" : ""}
                        </div>
                        <div className={styles.stepperFullStepLabel}>
                          {row.label}
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
