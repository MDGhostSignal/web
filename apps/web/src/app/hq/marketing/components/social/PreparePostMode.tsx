"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/admin";
import { copyText } from "@/lib/clipboard";
import {
  bodyForPlatform,
  PLATFORM_LABELS,
} from "@/lib/social-posts-types";
import type {
  SocialPlatform,
  SocialPostWithImages,
} from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

type Props = {
  post: SocialPostWithImages;
  /** Called after the user clicks "Mark as posted" so the parent refreshes. */
  onPosted: () => void;
  /** Close the modal without marking posted. */
  onClose: () => void;
};

/**
 * The "publish moment" companion: walk the user through pasting the
 * caption + grabbing the images for each platform. Auto-copies the
 * first platform's body to the clipboard on open, then lets the user
 * swap platforms or copy again.
 *
 * Closes with "Mark as posted" which transitions status to 'posted'
 * (server stamps posted_at).
 */
export function PreparePostMode({ post, onPosted, onClose }: Props) {
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>(
    post.platforms[0] ?? "instagram",
  );
  const [copiedAt, setCopiedAt] = useState<number | null>(null);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBody = bodyForPlatform(post, activePlatform);

  // Auto-copy on open + whenever the active platform changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await copyText(currentBody);
      if (ok && !cancelled) setCopiedAt(Date.now());
    })();
    return () => {
      cancelled = true;
    };
  }, [currentBody]);

  async function recopy(): Promise<void> {
    const ok = await copyText(currentBody);
    if (ok) setCopiedAt(Date.now());
  }

  async function handleMarkPosted(): Promise<void> {
    setMarking(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/marketing-social/${encodeURIComponent(post.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "posted" }),
        },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Failed (${res.status}): ${detail.slice(0, 200)}`);
      }
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMarking(false);
    }
  }

  const justCopied = copiedAt != null && Date.now() - copiedAt < 4000;

  return (
    <div className={styles.prepareMode}>
      <p className={styles.prepareIntro}>
        Caption&apos;s on your clipboard. Open the platform, paste the
        text, attach the {post.images.length === 1 ? "image" : "images"}{" "}
        below, then come back and mark it posted.
      </p>

      {post.platforms.length > 1 && (
        <div className={styles.preparePlatforms}>
          {post.platforms.map((p) => (
            <button
              key={p}
              type="button"
              className={[
                styles.preparePlatformChip,
                p === activePlatform ? styles.preparePlatformChipActive : "",
              ].join(" ")}
              onClick={() => setActivePlatform(p)}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      <section className={styles.prepareCaption}>
        <header className={styles.prepareCaptionHeader}>
          <span className={styles.postDetailBodyLabel}>
            {PLATFORM_LABELS[activePlatform]} caption
          </span>
          <Button
            variant={justCopied ? "primary" : "secondary"}
            size="sm"
            onClick={recopy}
          >
            {justCopied ? "Copied!" : "Copy again"}
          </Button>
        </header>
        <textarea
          readOnly
          className={styles.prepareTextarea}
          value={currentBody}
          rows={Math.min(12, Math.max(4, currentBody.split("\n").length + 1))}
          onFocus={(e) => e.currentTarget.select()}
        />
      </section>

      {post.images.length > 0 && (
        <section className={styles.prepareImages}>
          <header className={styles.postDetailBodyLabel}>
            {post.images.length}{" "}
            {post.images.length === 1 ? "image" : "images"} to attach
          </header>
          <div className={styles.postDetailImageGrid}>
            {post.images.map((img) => (
              <a
                key={img.id}
                href={img.public_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={styles.prepareImageLink}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.public_url}
                  alt=""
                  className={styles.postDetailImage}
                />
                <span className={styles.prepareImageOverlay}>
                  Open / download
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.postDetailActions}>
        <Button variant="ghost" onClick={onClose} disabled={marking}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={handleMarkPosted}
          disabled={marking}
        >
          {marking ? "Marking…" : "Mark as posted"}
        </Button>
      </div>
    </div>
  );
}
