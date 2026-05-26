"use client";

import { useMemo } from "react";

import { localDateKey, startOfDay } from "@/lib/social-calendar";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { PostCell } from "./PostCell";

type Props = {
  /** The day being shown — only the local date is used. */
  day: Date;
  posts: SocialPostRow[];
  onSelectPost: (id: string) => void;
  /** Called when the user clicks the "+" on an hour row. `when`
   *  carries the day @ that hour @ :00:00 local. */
  onAddAt: (when: Date) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Single-day, 24-hour grid (Google-Calendar day-view shape). Each
 * hour row gets a label, a slot for any scheduled posts at that hour,
 * and a "+" affordance that opens the composer pre-filled with the
 * clicked hour.
 *
 * Hour-bucketing is by local hour of `scheduled_at`. Posts whose date
 * doesn't match `day` are filtered out — the caller can pass the full
 * fetched window without pre-filtering.
 */
export function DayCalendar({ day, posts, onSelectPost, onAddAt }: Props) {
  const dayKey = useMemo(() => localDateKey(startOfDay(day)), [day]);

  const buckets = useMemo(() => {
    const map = new Map<number, SocialPostRow[]>();
    for (const p of posts) {
      const d = new Date(p.scheduled_at);
      if (localDateKey(d) !== dayKey) continue;
      const hour = d.getHours();
      const arr = map.get(hour) ?? [];
      arr.push(p);
      map.set(hour, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime(),
      );
    }
    return map;
  }, [posts, dayKey]);

  function handleHourAdd(h: number): void {
    const when = startOfDay(day);
    when.setHours(h, 0, 0, 0);
    onAddAt(when);
  }

  return (
    <div className={styles.dayCalendar} role="grid" aria-label="Day schedule">
      {HOURS.map((h) => {
        const items = buckets.get(h) ?? [];
        return (
          <div key={h} className={styles.dayHourRow} role="row">
            <div className={styles.dayHourLabel}>{formatHour(h)}</div>
            <div className={styles.dayHourSlot}>
              {items.map((p) => (
                <PostCell
                  key={p.id}
                  post={p}
                  onClick={() => onSelectPost(p.id)}
                />
              ))}
              <button
                type="button"
                className={styles.dayHourAdd}
                onClick={() => handleHourAdd(h)}
                aria-label={`Add post at ${formatHour(h)}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
