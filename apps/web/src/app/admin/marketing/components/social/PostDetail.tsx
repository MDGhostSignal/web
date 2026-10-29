"use client";

import { useState } from "react";

import { Button } from "@/components/admin";
import {
  imageSuggestionText,
  topicFromNotes,
} from "@/lib/social-topics";
import type {
  SocialPlatform,
  SocialPostPatchInput,
  SocialPostWithImages,
} from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { PostComposer } from "./PostComposer";

type Props = {
  post: SocialPostWithImages;
  onSaved: () => void;
  onDeleted: () => void;
};

type Mode = "view" | "edit";

/**
 * A planned post: headline, topic, and image suggestion on a date.
 * Edit reuses the composer. Remove deletes the row.
 */
export function PostDetail({ post, onSaved, onDeleted }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(payload: SocialPostPatchInput): Promise<void> {
    const res = await fetch(
      `/api/admin/marketing-social/${encodeURIComponent(post.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Save failed (${res.status}): ${detail.slice(0, 200)}`);
    }
  }

  async function handleEditSubmit(payload: {
    title: string | null;
    body: string;
    body_facebook: string | null;
    body_instagram: string | null;
    body_substack: string | null;
    platforms: SocialPlatform[];
    scheduled_at: string;
    notes: string | null;
  }): Promise<void> {
    await patch(payload);
    setMode("view");
    onSaved();
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Remove this post from the calendar?")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/marketing-social/${encodeURIComponent(post.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(
          `Delete failed (${res.status}): ${detail.slice(0, 200)}`,
        );
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  if (mode === "edit") {
    return (
      <PostComposer
        initial={post}
        onSubmit={handleEditSubmit}
        onCancel={() => setMode("view")}
        submitLabel="Save changes"
      />
    );
  }

  const scheduled = new Date(post.scheduled_at);
  const scheduledLabel = Number.isNaN(scheduled.getTime())
    ? "—"
    : scheduled.toLocaleString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
  const topic = topicFromNotes(post.notes);
  const suggestion = imageSuggestionText(post.body);

  return (
    <div className={styles.postDetail}>
      <div className={styles.postDetailMeta}>
        <span className={styles.detailMetaKey}>Date</span>
        <span className={styles.detailMetaValue}>{scheduledLabel}</span>

        <span className={styles.detailMetaKey}>Topic</span>
        <span className={styles.detailMetaValue}>
          {topic ? (
            <span className={styles.topicLabel}>
              <span
                className={styles.postChipDot}
                style={{ background: topic.color }}
              />
              {topic.label}
            </span>
          ) : (
            "—"
          )}
        </span>

        <span className={styles.detailMetaKey}>Headline</span>
        <span className={styles.detailMetaValue}>
          {post.title?.trim() || "—"}
        </span>
      </div>

      <section className={styles.postDetailBodyBlock}>
        <header className={styles.postDetailBodyLabel}>Image suggestion</header>
        <p className={styles.postDetailBody}>
          {suggestion || "No image suggestion yet."}
        </p>
      </section>

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.postDetailActions}>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Removing…" : "Remove"}
        </Button>
        <div className={styles.postDetailActionsRight}>
          <Button variant="primary" onClick={() => setMode("edit")} disabled={deleting}>
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
