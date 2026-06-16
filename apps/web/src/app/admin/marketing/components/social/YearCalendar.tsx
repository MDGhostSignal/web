"use client";

import { useMemo } from "react";

import { startOfYear } from "@/lib/social-calendar";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { MiniMonth } from "./MiniMonth";

type Props = {
  /** Any date in the year to render. */
  anchor: Date;
  posts: SocialPostRow[];
  /** Click a month header → switch to Month view for that month. */
  onSelectMonth: (month: Date) => void;
  /** Click a day cell inside a mini-month → switch to Day view. */
  onSelectDay: (day: Date) => void;
};

/**
 * 12-month grid (4 columns × 3 rows) of `MiniMonth` instances. Posts
 * are passed through verbatim — each mini-month does its own bucket-
 * counting since we want to share one fetched window across all twelve.
 *
 * Layout collapses gracefully: 3 columns at 1280 px, 2 at 900 px,
 * 1 at 600 px. Driven by CSS — nothing for the parent to think about.
 */
export function YearCalendar({
  anchor,
  posts,
  onSelectMonth,
  onSelectDay,
}: Props) {
  const months = useMemo(() => {
    const start = startOfYear(anchor);
    const out: Date[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setMonth(i);
      out.push(d);
    }
    return out;
  }, [anchor]);

  return (
    <div className={styles.yearCalendar}>
      {months.map((m) => (
        <MiniMonth
          key={m.getMonth()}
          month={m}
          posts={posts}
          onSelectMonth={onSelectMonth}
          onSelectDay={onSelectDay}
        />
      ))}
    </div>
  );
}
