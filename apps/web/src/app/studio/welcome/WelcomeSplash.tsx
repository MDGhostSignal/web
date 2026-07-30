"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import styles from "./welcome.module.css";

/**
 * The onboarding splash body. Everything here reuses the existing
 * member-scoped APIs: image → POST /api/studio/profile/image,
 * description + RSS → PATCH /api/studio/profile. Quiz tiles link out
 * to the public quizzes (submissions auto-link back to the member
 * row); a window-focus listener refreshes the server state so tiles
 * flip to done when the member returns from a quiz tab. When the
 * final item completes, the server page redirects to the roster on
 * the next refresh — finishing setup IS entering the studio.
 */
export function WelcomeSplash({
  firstName,
  kind,
  orgName,
  imageUrl: initialImageUrl,
  description: initialDescription,
  rssUrl: initialRssUrl,
  xqDone,
  rqDone,
  xqLabel,
  rqLabel,
}: {
  firstName: string | null;
  kind: "brand" | "creator" | "other";
  orgName: string;
  imageUrl: string | null;
  description: string | null;
  rssUrl: string | null;
  xqDone: boolean;
  rqDone: boolean;
  xqLabel: string | null;
  rqLabel: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [rssUrl, setRssUrl] = useState(initialRssUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingRss, setPendingRss] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = kind === "creator";

  // Coming back from a quiz tab → re-check the database. The server
  // page recomputes quiz status (and redirects to the roster when
  // everything is complete).
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const cardDone =
    imageUrl !== null &&
    description.trim().length > 0 &&
    (!isCreator || rssUrl.trim().length > 0);
  const doneCount = [xqDone, rqDone, cardDone].filter(Boolean).length;

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/studio/profile/image", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.imageUrl) {
        throw new Error(json?.error ?? `Upload failed (${res.status}).`);
      }
      setImageUrl(json.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const body: Record<string, string> = { description };
      if (isCreator) body.rssUrl = rssUrl;
      const res = await fetch("/api/studio/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        pendingRss?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `Save failed (${res.status}).`);
      }
      setSaved(true);
      setPendingRss(json.pendingRss === true);
      // Server recomputes completeness — and redirects to the roster
      // if this save was the last open item.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function skipForNow() {
    // The roster honors this for a week, then nudges again.
    document.cookie = "studio-welcome-skip=1; path=/; max-age=604800";
    router.push("/studio/roster");
  }

  return (
    <div className={styles.splash}>
      {/* --- Hero ---------------------------------------------------- */}
      <header className={styles.hero}>
        <p className={styles.eyebrow}>GhostSignal Studio · Welcome</p>
        <h1 className={styles.title}>
          Welcome in{firstName ? `, ${firstName}` : ""}. Let&apos;s set up
          your card.
        </h1>
        <p className={styles.lede}>
          Your profile becomes your card on the network roster — partners
          flip through it like a deck. Three quick things and you&apos;re
          in.
        </p>
        <div
          className={styles.progressChips}
          aria-label={`${doneCount} of 3 setup steps complete`}
        >
          <ProgressChip done={xqDone} label="XQ quiz" />
          <ProgressChip done={rqDone} label="RQ quiz" />
          <ProgressChip done={cardDone} label="Your card" />
        </div>
      </header>

      {/* --- Quizzes ------------------------------------------------- */}
      <div className={styles.quizRow}>
        <QuizTile
          done={xqDone}
          doneLabel={xqLabel}
          name="XQ — Conviction Quotient"
          blurb="Your archetype: how you decide, what you won't trade away. It powers who we match you with."
          href="/xq-quiz"
        />
        <QuizTile
          done={rqDone}
          doneLabel={rqLabel}
          name="RQ — Resonance Quotient"
          blurb="Your signal read: clarity, undertone, horizon. The other half of the matching engine."
          href="/rq-quiz"
        />
      </div>

      {/* --- Card form ----------------------------------------------- */}
      <form className={styles.cardForm} onSubmit={onSave}>
        <h2 className={styles.cardFormTitle}>Your card</h2>

        <div className={styles.uploadRow}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={84}
              height={84}
              className={styles.uploadPreview}
              unoptimized
            />
          ) : (
            <span className={styles.uploadEmpty} aria-hidden="true">
              {orgName.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <div className={styles.uploadText}>
            <span className={styles.fieldLabel}>
              {isCreator ? "Show image" : kind === "brand" ? "Brand logo" : "Profile image"}
            </span>
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? "Uploading…"
                : imageUrl
                  ? "Replace image"
                  : "Upload image"}
            </button>
            <span className={styles.fieldHint}>
              PNG, JPG, WebP, or SVG · up to 4 MB. This is the face of
              your card.
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onPickImage}
            hidden
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="welcome-description">
            {isCreator
              ? "What is your show about?"
              : kind === "brand"
                ? "What does your brand do?"
                : "What do you do?"}
          </label>
          <textarea
            id="welcome-description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder={
              isCreator
                ? "Tell the network what you do — your show's premise, your audience, and what makes it distinct. Partners read this on your card, so write it for the brand you want to attract."
                : kind === "brand"
                  ? "Tell the network what you do — your brand, your products, and the partnerships you're looking for. Creators read this on your card, so write it for the show you want to reach."
                  : "Tell the network what you do and why you're here. This is the description others read on your card."
            }
          />
        </div>

        {isCreator && (
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="welcome-rss">
              Your show&apos;s RSS feed URL
              <span className={styles.required}>required</span>
            </label>
            <input
              id="welcome-rss"
              className={styles.input}
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://feeds.example.com/your-show"
              inputMode="url"
            />
            <span className={styles.fieldHint}>
              The feed your current host publishes. The team needs this
              on record to move your show onto ART19.
            </span>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {saved && !error && (
          <div className={styles.saved}>
            Saved.
            {pendingRss &&
              " (Your RSS URL couldn't be stored yet — the team has been slow with a database update. Please re-save it in a day or two.)"}
          </div>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? "Saving…" : "Save card"}
          </button>
          <button
            type="button"
            className={styles.skipBtn}
            onClick={skipForNow}
          >
            Skip for now — I&apos;ll finish later
          </button>
        </div>
      </form>
    </div>
  );
}

function ProgressChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`${styles.chip} ${done ? styles.chipDone : ""}`}
    >
      <span className={styles.chipMark} aria-hidden="true">
        {done ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}

function QuizTile({
  done,
  doneLabel,
  name,
  blurb,
  href,
}: {
  done: boolean;
  doneLabel: string | null;
  name: string;
  blurb: string;
  href: string;
}) {
  return (
    <section className={`${styles.quizTile} ${done ? styles.quizTileDone : ""}`}>
      <h2 className={styles.quizTileName}>{name}</h2>
      {done ? (
        <p className={styles.quizTileStatus}>
          <span className={styles.quizTileCheck} aria-hidden="true">
            ✓
          </span>
          Done{doneLabel ? ` — ${doneLabel}` : ""}
        </p>
      ) : (
        <>
          <p className={styles.quizTileBlurb}>{blurb}</p>
          <Link href={href} className={styles.quizTileCta}>
            Take the quiz →
          </Link>
        </>
      )}
    </section>
  );
}
