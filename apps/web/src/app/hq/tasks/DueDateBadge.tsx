import styles from "./DueDateBadge.module.css";

/**
 * Urgency tiers for the due-date badge. Drives both the color and
 * the relative label; computed from the date difference and the
 * task's current status (inactive tasks always tier "done" so a
 * completed task with a past due date doesn't look like an
 * emergency).
 */
type DueTier = "overdue" | "today" | "soon" | "later" | "done";

type Result = { label: string; tier: DueTier };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Smart relative-date label for a task's due_date. Returns null when
 * there's no due date set. Comparison is at calendar-day resolution
 * (both sides snapped to local midnight) so "today" is the local
 * day, not the last 24h.
 */
export function formatDueDate(
  iso: string | null | undefined,
  isInactive: boolean,
): Result | null {
  if (!iso) return null;
  // Date-only inputs (YYYY-MM-DD) parse as UTC midnight; build via
  // local-date components instead so "Today" matches the user's
  // calendar regardless of timezone.
  const parts = iso.slice(0, 10).split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / DAY_MS);

  // Inactive tasks (completed / archived) — keep the same label
  // shape but always render as "done" tier (muted, struck through).
  // No more "5 days overdue" warning red on a completed task.
  if (isInactive) {
    if (diffDays === 0) return { label: "Today", tier: "done" };
    if (diffDays === 1) return { label: "Tomorrow", tier: "done" };
    if (diffDays === -1) return { label: "Yesterday", tier: "done" };
    if (diffDays < 0)
      return { label: `${Math.abs(diffDays)}d overdue`, tier: "done" };
    if (diffDays > 0 && diffDays <= 7)
      return { label: `In ${diffDays}d`, tier: "done" };
    return {
      label: due.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      tier: "done",
    };
  }

  if (diffDays === 0) return { label: "Today", tier: "today" };
  if (diffDays === 1) return { label: "Tomorrow", tier: "soon" };
  if (diffDays === -1) return { label: "Yesterday", tier: "overdue" };
  if (diffDays < 0)
    return { label: `${Math.abs(diffDays)}d overdue`, tier: "overdue" };
  if (diffDays <= 7) return { label: `In ${diffDays}d`, tier: "soon" };
  // > 7 days out: switch to absolute month/day, no more relative.
  return {
    label: due.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    tier: "later",
  };
}

/**
 * Badge component that renders the formatted due-date label with a
 * small calendar icon, color-coded by urgency tier. Renders nothing
 * when the task has no due date.
 */
export function DueDateBadge({
  isoDate,
  isInactive,
}: {
  isoDate: string | null | undefined;
  isInactive: boolean;
}) {
  const result = formatDueDate(isoDate, isInactive);
  if (!result) return null;
  return (
    <span
      className={`${styles.badge} ${styles[`tier_${result.tier}`]}`}
      title={isoDate ?? undefined}
    >
      <svg
        className={styles.icon}
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {result.label}
    </span>
  );
}
