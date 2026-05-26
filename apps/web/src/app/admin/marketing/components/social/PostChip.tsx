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
  onClick: (e: React.MouseEvent) => void;
};

/**
 * Single-line compact chip used in dense calendar cells (month view,
 * year view's mini-month bars). Tradeoff vs PostCell: drops the status
 * pill + multi-platform stacked bars in favour of one dot + time +
 * truncated title, all on one row.
 *
 * Click bubbles via `e.stopPropagation` inside the handler — month
 * cells listen for cell-level clicks to drill into Day view, so each
 * chip needs to swallow its own click.
 */
export function PostChip({ post, onClick }: Props) {
  const time = new Date(post.scheduled_at);
  const timeLabel = Number.isNaN(time.getTime())
    ? "—"
    : time.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });

  const displayTitle =
    post.title?.trim() ||
    post.body.split("\n")[0].slice(0, 60).trim() ||
    "(untitled)";

  const firstPlatform = post.platforms[0];
  const dotColor = firstPlatform ? PLATFORM_COLORS[firstPlatform] : undefined;
  const platformsLabel = post.platforms
    .map((p) => PLATFORM_LABELS[p])
    .join(", ");

  return (
    <button
      type="button"
      className={[
        styles.postChip,
        post.status === "draft" ? styles.postChipDraft : "",
        post.status === "posted" ? styles.postChipPosted : "",
        post.status === "skipped" ? styles.postChipSkipped : "",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      aria-label={`${displayTitle} — ${platformsLabel} at ${timeLabel} (${STATUS_LABELS[post.status]})`}
      title={`${timeLabel} · ${displayTitle}`}
    >
      <span
        className={styles.postChipDot}
        aria-hidden="true"
        style={dotColor ? { background: dotColor } : undefined}
      />
      <span className={styles.postChipTime}>{timeLabel}</span>
      <span className={styles.postChipTitle}>{displayTitle}</span>
    </button>
  );
}
