"use client";

import { useMemo } from "react";

import {
  localDateKey,
  startOfMonth,
  startOfWeek,
} from "@/lib/social-calendar";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

type Props = {
  /** Any date inside the month — only month/year are used. */
  month: Date;
  /** All posts within (or near) this month; the component buckets. */
  posts: SocialPostRow[];
  /** Click the month header → switch to Month view for this month. */
  onSelectMonth: (month: Date) => void;
  /** Click any day cell → switch to Day view for that date. */
  onSelectDay: (day: Date) => void;
};

const DAY_HEADER_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Compact 7-column day grid for a single month — used 12 times by the
 * Year view. Each day cell shows the day number; cells with posts get
 * a heat-map background tint scaled by post count (clamped at 3+).
 * Out-of-month spillover days render dimmer and aren't clickable.
 * Today gets the accent ring.
 *
 * Always renders 6 rows × 7 cols (42 cells) so all 12 mini-months in
 * the Year view share the same vertical footprint regardless of how
 * the month starts.
 */
export function MiniMonth({
  month,
  posts,
  onSelectMonth,
  onSelectDay,
}: Props) {
  const monthStart = useMemo(() => startOfMonth(month), [month]);
  const monthIndex = monthStart.getMonth();

  const cells = useMemo(() => {
    const gridStart = startOfWeek(monthStart);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      d.setHours(0, 0, 0, 0);
      out.push(d);
    }
    return out;
  }, [monthStart]);

  // Bucket: local-date YYYY-MM-DD → post count. We don't need the rows
  // themselves here (Year view doesn't render chips), so a count is
  // enough.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) {
      const key = localDateKey(new Date(p.scheduled_at));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [posts]);

  const todayKey = localDateKey(new Date());
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
  });

  return (
    <div className={styles.miniMonth}>
      <button
        type="button"
        className={styles.miniMonthHeader}
        onClick={() => onSelectMonth(monthStart)}
        aria-label={`Open ${monthLabel} in month view`}
      >
        {monthLabel}
      </button>

      <div className={styles.miniMonthWeekdays} aria-hidden="true">
        {DAY_HEADER_LABELS.map((d, i) => (
          <span key={i} className={styles.miniMonthWeekdayLabel}>
            {d}
          </span>
        ))}
      </div>

      <div className={styles.miniMonthGrid} role="grid">
        {cells.map((day) => {
          const key = localDateKey(day);
          const isToday = key === todayKey;
          const isOutsideMonth = day.getMonth() !== monthIndex;
          const count = counts.get(key) ?? 0;
          // Heat-map level 0–3 (clamped). Drives the bg-tint CSS class.
          const heat = isOutsideMonth ? 0 : Math.min(count, 3);

          if (isOutsideMonth) {
            // Blank spacer — keeps grid alignment without inviting a
            // misleading click.
            return <span key={key} className={styles.miniMonthDayBlank} />;
          }

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              className={[
                styles.miniMonthDay,
                isToday ? styles.miniMonthDayToday : "",
                heat > 0 ? styles[`miniMonthDayHeat${heat}`] : "",
              ].join(" ")}
              onClick={() => onSelectDay(day)}
              aria-label={`${day.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })} — ${count} post${count === 1 ? "" : "s"}`}
              title={
                count > 0
                  ? `${count} post${count === 1 ? "" : "s"} on ${day.toLocaleDateString()}`
                  : day.toLocaleDateString()
              }
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
