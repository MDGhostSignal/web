"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/admin";
import {
  PLATFORM_LABELS,
  PLATFORMS,
} from "@/lib/social-posts-types";
import type {
  SocialPlatform,
  SocialPostRow,
} from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

type Props = {
  initial?: SocialPostRow | null;
  /** Pre-fill the date pickers when launching from "Add on day". */
  initialDate?: Date | null;
  onSubmit: (payload: {
    title: string | null;
    body: string;
    body_facebook: string | null;
    body_instagram: string | null;
    body_substack: string | null;
    platforms: SocialPlatform[];
    scheduled_at: string;
    notes: string | null;
    /** When creating, we save in draft; the user transitions later. */
    status?: SocialPostRow["status"];
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

/**
 * Create / edit form for a social post. One step — all fields on
 * screen. Per-platform body fields only reveal when multiple
 * platforms are selected (no decision fatigue for the common single-
 * platform case).
 */
export function PostComposer({
  initial,
  initialDate,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  const defaultScheduled = useMemo(() => {
    const d = initial
      ? new Date(initial.scheduled_at)
      : initialDate
        ? withTime(initialDate, 9, 0)
        : withTime(new Date(), 9, 0);
    return toDateTimeLocal(d);
  }, [initial, initialDate]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(
    initial?.platforms ?? ["instagram"],
  );
  const [bodyFb, setBodyFb] = useState(initial?.body_facebook ?? "");
  const [bodyIg, setBodyIg] = useState(initial?.body_instagram ?? "");
  const [bodySs, setBodySs] = useState(initial?.body_substack ?? "");
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduled);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const multiPlatform = platforms.length > 1;

  function togglePlatform(p: SocialPlatform): void {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (body.trim().length === 0) {
      setError("Body is required.");
      return;
    }
    if (platforms.length === 0) {
      setError("Pick at least one platform.");
      return;
    }
    const d = parseDateTimeLocal(scheduledLocal);
    if (!d) {
      setError("Pick a valid date and time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim() || null,
        body: body.trim(),
        body_facebook: multiPlatform && bodyFb.trim() ? bodyFb.trim() : null,
        body_instagram: multiPlatform && bodyIg.trim() ? bodyIg.trim() : null,
        body_substack: multiPlatform && bodySs.trim() ? bodySs.trim() : null,
        platforms,
        scheduled_at: d.toISOString(),
        notes: notes.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.formField}>
        <span className={styles.formLabel}>Title (optional, internal label)</span>
        <input
          type="text"
          className={styles.formInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. Q2 brand-guide launch"
        />
      </label>

      <div className={styles.formField}>
        <span className={styles.formLabel}>Platforms</span>
        <div className={styles.platformPicker}>
          {PLATFORMS.map((p) => (
            <label key={p} className={styles.platformChip}>
              <input
                type="checkbox"
                checked={platforms.includes(p)}
                onChange={() => togglePlatform(p)}
              />
              {PLATFORM_LABELS[p]}
            </label>
          ))}
        </div>
      </div>

      <label className={styles.formField}>
        <span className={styles.formLabel}>
          {multiPlatform ? "Default body (used when no per-platform override)" : "Body"}
        </span>
        <textarea
          className={styles.formInput}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
        />
      </label>

      {multiPlatform && platforms.includes("facebook") && (
        <label className={styles.formField}>
          <span className={styles.formLabel}>Facebook body (optional)</span>
          <textarea
            className={styles.formInput}
            value={bodyFb}
            onChange={(e) => setBodyFb(e.target.value)}
            rows={3}
            placeholder="Leave blank to use the default body."
          />
        </label>
      )}

      {multiPlatform && platforms.includes("instagram") && (
        <label className={styles.formField}>
          <span className={styles.formLabel}>Instagram body (optional)</span>
          <textarea
            className={styles.formInput}
            value={bodyIg}
            onChange={(e) => setBodyIg(e.target.value)}
            rows={3}
            placeholder="Leave blank to use the default body."
          />
        </label>
      )}

      {multiPlatform && platforms.includes("substack") && (
        <label className={styles.formField}>
          <span className={styles.formLabel}>
            Substack body (optional, supports markdown)
          </span>
          <textarea
            className={styles.formInput}
            value={bodySs}
            onChange={(e) => setBodySs(e.target.value)}
            rows={6}
            placeholder="Leave blank to use the default body."
          />
        </label>
      )}

      <label className={styles.formField}>
        <span className={styles.formLabel}>Scheduled for</span>
        <input
          type="datetime-local"
          className={styles.formInput}
          value={scheduledLocal}
          onChange={(e) => setScheduledLocal(e.target.value)}
          required
        />
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Notes (internal)</span>
        <textarea
          className={styles.formInput}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything for future-you when this comes due."
        />
      </label>

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.formActions}>
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : (submitLabel ?? "Save draft")}
        </Button>
      </div>
    </form>
  );
}

/* --- datetime-local helpers ----------------------------------------- */

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function withTime(d: Date, h: number, m: number): Date {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
}
