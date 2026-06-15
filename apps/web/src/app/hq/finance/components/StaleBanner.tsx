"use client";

import { useEffect, useState } from "react";

import type { MercurySyncRunRow } from "@/lib/mercury-types";

import styles from "../finance.module.css";

type Props = {
  lastSync: MercurySyncRunRow | null;
};

const STALE_AFTER_MS = 45 * 60 * 1000;

/**
 * Yellow warning banner shown above the dashboard when:
 *  - the most recent sync errored, or
 *  - the most recent sync is older than 45 minutes (cron is 15-min cadence,
 *    so any gap > 45 min means cron has failed at least twice in a row), or
 *  - there's never been a successful sync.
 *
 * Rendered as a non-blocking inline banner — the dashboard underneath
 * still shows whatever data is in the cache, but the team is now aware
 * the numbers may be out of date. This matches the UX research's
 * "don't hide stale data; make its age transparent" principle.
 *
 * Time tracking is done in client state (not Date.now() during render)
 * so React 19's purity rule is happy and so the banner can flip from
 * "fresh" to "stale" without a parent refetch.
 */
export function StaleBanner({ lastSync }: Props) {
  // Lazy useState — initializer runs during the first render but is
  // not considered an impurity by react-hooks/purity. The effect only
  // schedules the recurring tick, so there's no setState-in-effect-body
  // violation either.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const ts = lastSync?.finished_at ?? lastSync?.started_at ?? null;
  const ageMs = ts ? Math.max(0, now - new Date(ts).getTime()) : Infinity;
  const status = lastSync?.status ?? null;

  const isError = status === "error";
  const isStale = !isError && ageMs > STALE_AFTER_MS;
  const isMissing = !lastSync;

  if (!isError && !isStale && !isMissing) return null;

  const title = isError
    ? "Last sync failed"
    : isMissing
      ? "No sync runs yet"
      : "Sync data is stale";

  const detail = isError
    ? lastSync?.error_message ||
      "Mercury sync errored. See docs/MERCURY_INTEGRATION.md for recovery."
    : isMissing
      ? "Run the sync once to populate Mercury data. The 15-minute cron should pick up automatically."
      : "The 15-minute sync hasn't run for over 45 minutes. Try Refresh now or check the Vercel cron logs.";

  return (
    <div
      className={[
        styles.staleBanner,
        isError ? styles.staleBannerError : "",
      ].join(" ")}
      role="status"
    >
      <div className={styles.staleBannerBody}>
        <span className={styles.staleBannerTitle}>{title}</span>
        <p className={styles.staleBannerDetail}>{detail}</p>
      </div>
    </div>
  );
}
