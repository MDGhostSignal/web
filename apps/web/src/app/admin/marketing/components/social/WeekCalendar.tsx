"use client";

import { useMemo } from "react";

import { Button } from "@/components/admin";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { PostCell } from "./PostCell";

type Props = {
  /** Anchor date used to compute the visible Mon–Sun week. */
  weekStart: Date;
  posts: SocialPostRow[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectPost: (id: string) => void;
  onAddOnDay: (day: Date) => void;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * 7-column Mon→Sun calendar grid for one week. Each day cell shows
 * the day number + an "+" button (click to compose) + a list of
 * PostCells sorted by scheduled_at.
 *
 * Drag-to-reschedule will land in Phase C; for now the day cell is
 * just a click target.
 */
export function WeekCalendar({
  weekStart,
  posts,
  onPrev,
  onNext,
  onToday,
  onSelectPost,
  onAddOnDay,
}: Props) {
  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  // Bucket posts by local-date YYYY-MM-DD.
  const buckets = useMemo(() => {
    const map = new Map<string, SocialPostRow[]>();
    for (const p of posts) {
      const key = localDateKey(new Date(p.scheduled_at));
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    // Sort each day's posts by scheduled_at ascending.
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      );
    }
    return map;
  }, [posts]);

  const rangeLabel = formatWeekRange(days[0], days[6]);
  const todayKey = localDateKey(new Date());

  return (
    <div className={styles.calendarWrap}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarRange}>{rangeLabel}</div>
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

      <div className={styles.calendarGrid}>
        {days.map((day, idx) => {
          const key = localDateKey(day);
          const isToday = key === todayKey;
          const dayPosts = buckets.get(key) ?? [];
          return (
            <div
              key={key}
              className={[
                styles.calendarDay,
                isToday ? styles.calendarDayToday : "",
              ].join(" ")}
            >
              <div className={styles.calendarDayHeader}>
                <span className={styles.calendarDayName}>
                  {DAY_LABELS[idx]}
                </span>
                <span className={styles.calendarDayNumber}>
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  className={styles.calendarDayAdd}
                  onClick={() => onAddOnDay(day)}
                  aria-label={`Add post on ${DAY_LABELS[idx]} ${day.getDate()}`}
                >
                  +
                </button>
              </div>
              <div className={styles.calendarDayPosts}>
                {dayPosts.map((p) => (
                  <PostCell
                    key={p.id}
                    post={p}
                    onClick={() => onSelectPost(p.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --- date helpers (kept local to avoid a lib bloat for now) --------- */

function buildWeekDays(weekStart: Date): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  return out;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatWeekRange(start: Date, end: Date): string {
  const fmt = (d: Date, withYear: boolean): string =>
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    });
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${fmt(start, false)} — ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${fmt(start, false)} — ${fmt(end, true)}`;
}

/**
 * Given any date, return the Monday of its local-time week (00:00).
 * Exported so the SocialSection can use the same anchor logic.
 */
export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  return out;
}
