"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/admin";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

type Props = {
  /** Click handler — switches the parent's sub-tab to Social. */
  onOpenSocial: () => void;
};

type ListResponse = {
  ok: true;
  posts: SocialPostRow[];
  count: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-app banner that shows when one or more scheduled posts are due
 * today or tomorrow. Sits at the top of /admin/marketing regardless
 * of which sub-tab is active so the team sees it the moment they
 * open the dashboard.
 *
 * Self-fetches a small window (next 48 h) so the parent doesn't have
 * to plumb post data through. Polls every 5 min to catch any updates
 * made elsewhere.
 */
export function DueBanner({ onOpenSocial }: Props) {
  const [dueCount, setDueCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh(): Promise<void> {
      try {
        const now = Date.now();
        const from = new Date(now).toISOString();
        const to = new Date(now + 2 * DAY_MS).toISOString();
        const res = await fetch(
          `/api/admin/marketing-social?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=scheduled&limit=50`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelled) setDueCount(null);
          return;
        }
        const json = (await res.json()) as ListResponse;
        if (!cancelled) setDueCount(json.posts.length);
      } catch {
        if (!cancelled) setDueCount(null);
      }
    }
    void refresh();
    const id = window.setInterval(refresh, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (dueCount == null || dueCount === 0) return null;

  return (
    <div className={styles.dueBanner} role="status">
      <span className={styles.dueBannerDot} aria-hidden="true" />
      <span className={styles.dueBannerText}>
        <strong>
          {dueCount} {dueCount === 1 ? "post" : "posts"} due
        </strong>{" "}
        in the next 48 hours
      </span>
      <Button variant="secondary" size="sm" onClick={onOpenSocial}>
        Open scheduler
      </Button>
    </div>
  );
}
