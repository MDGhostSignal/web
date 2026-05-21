"use client";

import { useState } from "react";

import { Badge, Button } from "@/components/admin";
import {
  bodyForPlatform,
  PLATFORM_LABELS,
  STATUS_LABELS,
} from "@/lib/social-posts-types";
import type {
  SocialPlatform,
  SocialPostPatchInput,
  SocialPostStatus,
  SocialPostWithImages,
} from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

import { PostComposer } from "./PostComposer";
import { PostImageUpload } from "./PostImageUpload";
import { PreparePostMode } from "./PreparePostMode";

type Props = {
  post: SocialPostWithImages;
  onSaved: () => void;
  onDeleted: () => void;
  /** Duplicate this post — caller opens a fresh composer pre-filled. */
  onDuplicate: () => void;
};

type Mode = "view" | "edit" | "prepare";

/**
 * Read-mode by default. Edit pencil swaps the body in-place for the
 * composer. Status transitions live in a button cluster at the
 * bottom; deleting drops the post + cascades to its Storage images.
 */
export function PostDetail({ post, onSaved, onDeleted, onDuplicate }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [deleting, setDeleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
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

  async function handleTransition(next: SocialPostStatus): Promise<void> {
    setTransitioning(true);
    setError(null);
    try {
      await patch({ status: next });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTransitioning(false);
    }
  }

  async function handleDeleteImage(imageId: string): Promise<void> {
    if (!window.confirm("Remove this image from the post?")) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/marketing-social/${encodeURIComponent(post.id)}/images/${encodeURIComponent(imageId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(
          `Image delete failed (${res.status}): ${detail.slice(0, 200)}`,
        );
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(`Delete this post? This cannot be undone.`)) return;
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

  if (mode === "prepare") {
    return (
      <PreparePostMode
        post={post}
        onPosted={() => {
          setMode("view");
          onSaved();
        }}
        onClose={() => setMode("view")}
      />
    );
  }

  const scheduled = new Date(post.scheduled_at);
  const scheduledLabel = Number.isNaN(scheduled.getTime())
    ? "—"
    : scheduled.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  return (
    <div className={styles.postDetail}>
      <div className={styles.postDetailMeta}>
        <span className={styles.detailMetaKey}>Scheduled</span>
        <span className={styles.detailMetaValue}>{scheduledLabel}</span>

        <span className={styles.detailMetaKey}>Status</span>
        <span className={styles.detailMetaValue}>
          <Badge variant={statusBadge(post.status)}>
            {STATUS_LABELS[post.status]}
          </Badge>
        </span>

        <span className={styles.detailMetaKey}>Platforms</span>
        <span className={styles.detailMetaValue}>
          {post.platforms.map((p) => (
            <Badge key={p} variant="neutral">
              {PLATFORM_LABELS[p]}
            </Badge>
          ))}
        </span>

        {post.posted_at && (
          <>
            <span className={styles.detailMetaKey}>Posted at</span>
            <span className={styles.detailMetaValue}>
              {new Date(post.posted_at).toLocaleString()}
            </span>
          </>
        )}
      </div>

      {post.platforms.map((p) => {
        const text = bodyForPlatform(post, p);
        const isCustom =
          (p === "facebook" && post.body_facebook) ||
          (p === "instagram" && post.body_instagram) ||
          (p === "substack" && post.body_substack);
        return (
          <section key={p} className={styles.postDetailBodyBlock}>
            <header className={styles.postDetailBodyHeader}>
              <span className={styles.postDetailBodyLabel}>
                {PLATFORM_LABELS[p]}
                {!isCustom && (
                  <span className={styles.postDetailBodyDim}>
                    {" "}
                    · default
                  </span>
                )}
              </span>
            </header>
            <pre className={styles.postDetailBody}>{text}</pre>
          </section>
        );
      })}

      <section className={styles.postDetailImages}>
        <header className={styles.postDetailBodyLabel}>
          {post.images.length === 0
            ? "Images"
            : `${post.images.length} ${post.images.length === 1 ? "image" : "images"}`}
        </header>
        {post.images.length > 0 && (
          <div className={styles.postDetailImageGrid}>
            {post.images.map((img) => (
              <div key={img.id} className={styles.postDetailImageWrap}>
                {/* Same rationale as other admin previews — mixed-source URLs.
                    eslint-disable-next-line @next/next/no-img-element */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.public_url}
                  alt=""
                  className={styles.postDetailImage}
                />
                <button
                  type="button"
                  className={styles.postDetailImageDelete}
                  onClick={() => handleDeleteImage(img.id)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <PostImageUpload postId={post.id} onUploaded={onSaved} />
      </section>

      {post.notes && (
        <section className={styles.postDetailNotes}>
          <header className={styles.postDetailBodyLabel}>Notes</header>
          <p className={styles.postDetailBody}>{post.notes}</p>
        </section>
      )}

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.postDetailActions}>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting || transitioning}
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>

        <div className={styles.postDetailActionsRight}>
          <Button
            variant="ghost"
            onClick={onDuplicate}
            disabled={deleting || transitioning}
            title="Create a new post pre-filled with these contents, scheduled one week later"
          >
            Duplicate
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode("edit")}
            disabled={deleting || transitioning}
          >
            Edit
          </Button>

          {post.status === "draft" && (
            <Button
              variant="primary"
              onClick={() => handleTransition("scheduled")}
              disabled={transitioning}
            >
              Mark as Scheduled
            </Button>
          )}
          {post.status === "scheduled" && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleTransition("skipped")}
                disabled={transitioning}
              >
                Skip
              </Button>
              <Button
                variant="primary"
                onClick={() => setMode("prepare")}
                disabled={transitioning}
              >
                Prepare to post
              </Button>
            </>
          )}
          {(post.status === "posted" || post.status === "skipped") && (
            <Button
              variant="secondary"
              onClick={() => handleTransition("draft")}
              disabled={transitioning}
            >
              Back to Draft
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function statusBadge(s: SocialPostStatus) {
  if (s === "draft") return "neutral" as const;
  if (s === "scheduled") return "warn" as const;
  if (s === "posted") return "success" as const;
  if (s === "skipped") return "info" as const;
  return "neutral" as const;
}
