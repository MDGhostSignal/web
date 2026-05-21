"use client";

import {
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  STATUS_LABELS,
} from "@/lib/social-posts-types";
import type { SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

type Props = {
  post: SocialPostRow;
  onClick: () => void;
};

/**
 * Compact post pill inside a day cell. Shows:
 *  - platform-tinted left bar (or stacked bars when multi-platform)
 *  - scheduled time (HH:MM)
 *  - truncated title (or first line of body if no title)
 *  - status pill (subtle — only renders for non-scheduled states)
 */
export function PostCell({ post, onClick }: Props) {
  const time = new Date(post.scheduled_at);
  const timeLabel = Number.isNaN(time.getTime())
    ? "—"
    : time.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });

  const displayTitle =
    post.title?.trim() ||
    post.body.split("\n")[0].slice(0, 80).trim() ||
    "(untitled)";

  return (
    <button
      type="button"
      className={[
        styles.postCell,
        post.status === "draft" ? styles.postCellDraft : "",
        post.status === "posted" ? styles.postCellPosted : "",
        post.status === "skipped" ? styles.postCellSkipped : "",
      ].join(" ")}
      onClick={onClick}
      aria-label={`${displayTitle} — ${post.platforms
        .map((p) => PLATFORM_LABELS[p])
        .join(", ")} at ${timeLabel} (${STATUS_LABELS[post.status]})`}
    >
      <div className={styles.postCellBars} aria-hidden="true">
        {post.platforms.map((p) => (
          <span
            key={p}
            className={styles.postCellBar}
            style={{ background: PLATFORM_COLORS[p] }}
          />
        ))}
      </div>
      <div className={styles.postCellBody}>
        <div className={styles.postCellTopRow}>
          <span className={styles.postCellTime}>{timeLabel}</span>
          {post.status !== "scheduled" && (
            <span className={styles.postCellStatus}>
              {STATUS_LABELS[post.status]}
            </span>
          )}
        </div>
        <div className={styles.postCellTitle}>{displayTitle}</div>
      </div>
    </button>
  );
}
