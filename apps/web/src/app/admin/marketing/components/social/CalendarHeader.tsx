"use client";

import { Button } from "@/components/admin";
import type { CalendarView } from "@/lib/social-calendar";
import { formatRangeLabel } from "@/lib/social-calendar";

import styles from "../../marketing.module.css";

import { ViewSwitcher } from "./ViewSwitcher";

type Props = {
  view: CalendarView;
  anchor: Date;
  onViewChange: (next: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

/**
 * Shared header rendered above every calendar view. Carries the range
 * label (computed from view + anchor), the view switcher, and the
 * prev / today / next navigation triplet. Per-view grid components
 * render only their grid — the header lives here so the four views
 * stay visually consistent.
 */
export function CalendarHeader({
  view,
  anchor,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <div className={styles.calendarHeader}>
      <div className={styles.calendarRange}>{formatRangeLabel(view, anchor)}</div>
      <div className={styles.calendarHeaderRight}>
        <ViewSwitcher view={view} onChange={onViewChange} />
        <div className={styles.calendarNav}>
          <Button variant="ghost" size="sm" onClick={onPrev}>
            ← Prev
          </Button>
          <Button variant="secondary" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={onNext}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
