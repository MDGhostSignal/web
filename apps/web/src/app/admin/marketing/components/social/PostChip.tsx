"use client";

import { topicFromNotes } from "@/lib/social-topics";
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
  const topic = topicFromNotes(post.notes);
  const displayTitle =
    post.title?.trim() || topic?.label || "(untitled)";
  const dotColor = topic?.color;

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
      aria-label={`${topic ? `${topic.label}: ` : ""}${displayTitle}`}
      title={`${topic ? `${topic.label} · ` : ""}${displayTitle}`}
    >
      <span
        className={styles.postChipDot}
        aria-hidden="true"
        style={dotColor ? { background: dotColor } : undefined}
      />
      <span className={styles.postChipTitle}>{displayTitle}</span>
    </button>
  );
}
