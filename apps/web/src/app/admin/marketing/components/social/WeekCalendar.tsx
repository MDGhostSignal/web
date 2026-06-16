"use client";

import { useMemo } from "react";

import { localDateKey, startOfWeek } from "@/lib/social-calendar";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { PostCell } from "./PostCell";

type Props = {
  /** Anchor date — week shown is the Mon→Sun containing this date. */
  weekStart: Date;
  posts: SocialPostRow[];
  onSelectPost: (id: string) => void;
  onAddOnDay: (day: Date) => void;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * 7-column Mon→Sun grid. Each day shows day label/number, an "+"
 * affordance to compose, and stacked PostCells sorted by scheduled_at.
 * Header (range label + view switcher + nav) is rendered by the
 * shared CalendarHeader above this component.
 */
export function WeekCalendar({
  weekStart,
  posts,
  onSelectPost,
  onAddOnDay,
}: Props) {
  const days = useMemo(() => buildWeekDays(startOfWeek(weekStart)), [weekStart]);

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
              <span className={styles.calendarDayName}>{DAY_LABELS[idx]}</span>
              <span className={styles.calendarDayNumber}>{day.getDate()}</span>
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
  );
}

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
