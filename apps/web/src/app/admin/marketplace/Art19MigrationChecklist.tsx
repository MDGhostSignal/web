"use client";

import {
  ART19_MIGRATION_STEPS,
  type LifecycleSteps,
  type Member,
  type StepStatus,
} from "@/lib/members";

import styles from "./marketplace.module.css";

type Props = {
  member: Member;
  onToggle: (stepKey: string, nextDone: boolean) => void | Promise<void>;
};

/**
 * Three-tick ART19 platform-migration checklist. Lives under the
 * marketplace lifecycle stepper on an expanded creator row. Stored in
 * `lifecycle_steps` (same jsonb as onboarding) but not counted toward
 * onboarding progress.
 */
export function Art19MigrationChecklist({ member, onToggle }: Props) {
  const steps = member.lifecycle_steps ?? ({} as LifecycleSteps);
  const done = ART19_MIGRATION_STEPS.filter(
    (s) => steps[s.key]?.status === "done",
  ).length;
  const total = ART19_MIGRATION_STEPS.length;
  const isComplete = done === total;

  return (
    <section
      className={styles.migrationBlock}
      aria-label="ART19 Migration"
    >
      <header className={styles.migrationHeader}>
        <h4 className={styles.migrationTitle}>ART19 Migration</h4>
        <p className={styles.migrationSummary}>
          {isComplete ? (
            <span className={styles.migrationSummaryComplete}>
              {total}/{total}
            </span>
          ) : (
            <>
              {done}/{total}
            </>
          )}
        </p>
      </header>
      <ul className={styles.migrationList}>
        {ART19_MIGRATION_STEPS.map((step) => {
          const status: StepStatus = steps[step.key]?.status ?? "todo";
          const isDone = status === "done";
          return (
            <li key={step.key} className={styles.migrationRow}>
              <label
                className={styles.migrationLabel}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className={styles.migrationCheckbox}
                  checked={isDone}
                  onChange={(e) => {
                    e.stopPropagation();
                    void onToggle(step.key, e.target.checked);
                  }}
                />
                <span
                  className={
                    isDone
                      ? styles.migrationLabelDone
                      : styles.migrationLabelText
                  }
                >
                  {step.label}
                </span>
              </label>
              {"href" in step && step.href ? (
                <a
                  className={styles.migrationLink}
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {step.hrefLabel} ↗
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
