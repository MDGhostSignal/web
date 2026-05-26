"use client";

import { useMemo } from "react";

import {
  localDateKey,
  startOfMonth,
  startOfWeek,
} from "@/lib/social-calendar";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { PostChip } from "./PostChip";

type Props = {
  /** Any date inside the month to render. */
  anchor: Date;
  posts: SocialPostRow[];
  /** Click a post chip → open the existing post-detail modal. */
  onSelectPost: (id: string) => void;
  /** Click a day cell (anywhere except a chip) → drill into Day view. */
  onDrillToDay: (day: Date) => void;
  /** Hover-reveal "+" in a cell header → open composer for that day. */
  onAddOnDay: (day: Date) => void;
};

const DAY_HEADER_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE_CHIPS = 3;

/**
 * 7-column × 6-row month grid (always 42 cells). Cells outside the
 * current month are rendered but visually muted; they remain clickable
 * (drilling into a spillover day is still valid). "Today" gets the
 * accent border; the month's first-of-day shows the month abbreviation
 * next to the day number as a visual anchor.
 *
 * Posts are bucketed by local-date YYYY-MM-DD. Each cell shows up to
 * MAX_VISIBLE_CHIPS chips sorted by scheduled_at; overflow renders as
 * a "+N more" pill that also drills into Day view (where all posts
 * for that day are reachable hour-by-hour).
 */
export function MonthCalendar({
  anchor,
  posts,
  onSelectPost,
  onDrillToDay,
  onAddOnDay,
}: Props) {
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);
  const monthIndex = monthStart.getMonth();

  const cells = useMemo(() => {
    // Start at the Monday of the week containing the 1st. Always 6
    // rows × 7 cols → 42 cells. Some months only need 5 rows but the
    // 6th row is harmless (renders as next-month spillover) and keeps
    // the grid height stable across months.
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

  const buckets = useMemo(() => {
    const map = new Map<string, SocialPostRow[]>();
    for (const p of posts) {
      const key = localDateKey(new Date(p.scheduled_at));
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      );
    }
    return map;
  }, [posts]);

  const todayKey = localDateKey(new Date());

  return (
    <div className={styles.monthCalendar}>
      <div className={styles.monthWeekdayRow} aria-hidden="true">
        {DAY_HEADER_LABELS.map((label) => (
          <div key={label} className={styles.monthWeekdayCell}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.monthGrid} role="grid" aria-label="Month schedule">
        {cells.map((day) => {
          const key = localDateKey(day);
          const isToday = key === todayKey;
          const isOutsideMonth = day.getMonth() !== monthIndex;
          const isFirstOfMonth = day.getDate() === 1;
          const dayPosts = buckets.get(key) ?? [];
          const visible = dayPosts.slice(0, MAX_VISIBLE_CHIPS);
          const overflow = dayPosts.length - visible.length;

          return (
            <div
              key={key}
              role="gridcell"
              className={[
                styles.monthDay,
                isToday ? styles.monthDayToday : "",
                isOutsideMonth ? styles.monthDayMuted : "",
              ].join(" ")}
              onClick={() => onDrillToDay(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDrillToDay(day);
                }
              }}
              tabIndex={0}
              aria-label={`${day.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })} — ${dayPosts.length} post${dayPosts.length === 1 ? "" : "s"}`}
            >
              <div className={styles.monthDayHeader}>
                <span className={styles.monthDayNumber}>
                  {isFirstOfMonth
                    ? day.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : day.getDate()}
                </span>
                <button
                  type="button"
                  className={styles.monthDayAdd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddOnDay(day);
                  }}
                  aria-label={`Add post on ${day.toLocaleDateString()}`}
                >
                  +
                </button>
              </div>

              <div className={styles.monthDayPosts}>
                {visible.map((p) => (
                  <PostChip
                    key={p.id}
                    post={p}
                    onClick={() => onSelectPost(p.id)}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    className={styles.monthDayOverflow}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDrillToDay(day);
                    }}
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
