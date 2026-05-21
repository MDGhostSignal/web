"use client";

import { useEffect, useState } from "react";

import { Button, Spinner } from "@/components/admin";
import type { MercurySyncRunRow } from "@/lib/mercury-types";
import { formatRelativeTimePast } from "@/lib/mercury-types";

import styles from "../finance.module.css";

type Props = {
  lastSync: MercurySyncRunRow | null;
  refreshing: boolean;
  onRefresh: () => void;
};

const STALE_AFTER_MS = 45 * 60 * 1000; // 45 min — the cron is 15-min cadence.

/**
 * "Last synced X ago" pill + manual refresh button. The pill colour
 * tells the team at a glance whether to trust the numbers:
 *   green dot — synced recently, status ok
 *   amber dot — synced > 45 min ago, possibly stale
 *   red dot   — last sync errored, definitely stale
 */
export function RefreshButton({ lastSync, refreshing, onRefresh }: Props) {
  // Re-render every 30 s so the "X min ago" pill counts up without a
  // full data re-fetch. Cheap; only updates this component subtree.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const ts = lastSync?.finished_at ?? lastSync?.started_at ?? null;
  const ageMs = ts ? Math.max(0, now - new Date(ts).getTime()) : Infinity;
  const status = lastSync?.status ?? null;

  const dotClass =
    status === "error"
      ? styles.syncPillDotError
      : ageMs > STALE_AFTER_MS
        ? styles.syncPillDotStale
        : styles.syncPillDot;

  return (
    <div className={styles.headerActions}>
      <span className={styles.syncPill} aria-live="polite">
        <span className={dotClass} aria-hidden="true" />
        {refreshing
          ? "Syncing…"
          : status === "error"
            ? `Sync failed · ${formatRelativeTimePast(ts, now)}`
            : `Last synced ${formatRelativeTimePast(ts, now)}`}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        leadingIcon={refreshing ? <Spinner size="sm" /> : null}
      >
        {refreshing ? "Refreshing" : "Refresh now"}
      </Button>
    </div>
  );
}
