"use client";

import { useEffect, useState } from "react";

import styles from "./StaleBadge.module.css";

/* =====================================================================
 * Shared in-memory cache of "which members currently have an open
 * alert?" — populated by a single `/api/admin/alerts` fetch and reused
 * by every <StaleBadge> on the page.
 *
 * Module-level state keeps things simple: no React context, no
 * provider boilerplate. Subscribers re-render when the set changes.
 *
 * The fetch is lazy + de-duplicated: the first badge to mount on the
 * page triggers the fetch; subsequent badges (and pages that mount
 * after a route change) reuse the cached set, refreshing only when
 * the data is older than `STALE_TTL_MS`.
 * ===================================================================== */

const STALE_TTL_MS = 120_000; // 2 minutes

let alertedIds: Set<string> | null = null;
let lastFetch = 0;
let inflight: Promise<Set<string>> | null = null;
const subscribers = new Set<() => void>();

async function fetchAlerted(): Promise<Set<string>> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch("/api/admin/alerts");
      if (!r.ok) return alertedIds ?? new Set<string>();
      const j = await r.json();
      const ids = new Set<string>();
      for (const a of j.alerts ?? []) {
        if (a.member?.id) ids.add(a.member.id);
      }
      alertedIds = ids;
      lastFetch = Date.now();
      subscribers.forEach((s) => s());
      return ids;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Hook: returns the set of member ids with an open alert. Triggers a
 *  fetch on mount when the cache is missing or stale. */
export function useAlertedMembers(): Set<string> {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((x) => x + 1);
    subscribers.add(cb);
    if (!alertedIds || Date.now() - lastFetch > STALE_TTL_MS) {
      void fetchAlerted();
    }
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return alertedIds ?? new Set<string>();
}

/**
 * <StaleBadge memberId={...} /> — small inline pill that renders only
 * when the given member has at least one open alert. Drop in next to
 * a member's name on any admin surface (Pool cards, Contacts rows,
 * the contracts dashboard, etc.) and it stays in sync with the
 * /api/admin/alerts state.
 */
export function StaleBadge({ memberId }: { memberId: string }) {
  const ids = useAlertedMembers();
  if (!ids.has(memberId)) return null;
  return (
    <span className={styles.badge} title="Open alert — see /admin/alerts">
      <span className={styles.dot} aria-hidden="true" />
      Alert
    </span>
  );
}
