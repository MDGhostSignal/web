"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/admin";
import {
  EMPTY_IMAGE_SUGGESTION,
  imageSuggestionText,
  SOCIAL_TOPICS,
  topicFromNotes,
} from "@/lib/social-topics";
import type { SocialPlatform, SocialPostRow } from "@/lib/social-posts-types";

import styles from "../../marketing.module.css";

type Props = {
  initial?: SocialPostRow | null;
  /** Pre-fill the date when launching from a calendar day. */
  initialDate?: Date | null;
  /** Pre-select a topic when the day was suggested by the weekly cycle. */
  initialTopicId?: string | null;
  onSubmit: (payload: {
    title: string | null;
    body: string;
    body_facebook: string | null;
    body_instagram: string | null;
    body_substack: string | null;
    platforms: SocialPlatform[];
    scheduled_at: string;
    notes: string | null;
    status?: SocialPostRow["status"];
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

/**
 * Simple planner form: date, topic, headline, image suggestion.
 * Platforms stay on the row (default Instagram) so the existing
 * social_posts schema and API keep working.
 */
export function PostComposer({
  initial,
  initialDate,
  initialTopicId,
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

  const [headline, setHeadline] = useState(initial?.title ?? "");
  const [topicId, setTopicId] = useState(
    topicFromNotes(initial?.notes)?.id ?? initialTopicId ?? SOCIAL_TOPICS[0].id,
  );
  const [imageSuggestion, setImageSuggestion] = useState(
    imageSuggestionText(initial?.body),
  );
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!topicId) {
      setError("Pick a topic.");
      return;
    }
    const d = parseDateTimeLocal(scheduledLocal);
    if (!d) {
      setError("Pick a valid date.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: headline.trim() || null,
        body: imageSuggestion.trim() || EMPTY_IMAGE_SUGGESTION,
        body_facebook: null,
        body_instagram: null,
        body_substack: null,
        platforms: initial?.platforms?.length
          ? initial.platforms
          : ["instagram"],
        scheduled_at: d.toISOString(),
        notes: topicId,
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
        <span className={styles.formLabel}>Date</span>
        <input
          type="datetime-local"
          className={styles.formInput}
          value={scheduledLocal}
          onChange={(e) => setScheduledLocal(e.target.value)}
          required
        />
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Topic</span>
        <select
          className={styles.formInput}
          value={topicId}
          onChange={(e) => setTopicId(e.target.value as (typeof SOCIAL_TOPICS)[number]["id"])}
        >
          {SOCIAL_TOPICS.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Headline</span>
        <input
          type="text"
          className={styles.formInput}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={200}
          placeholder="What this post says"
        />
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Image suggestion</span>
        <textarea
          className={styles.formInput}
          value={imageSuggestion}
          onChange={(e) => setImageSuggestion(e.target.value)}
          rows={3}
          placeholder="What the picture should be"
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
          {submitting ? "Saving…" : (submitLabel ?? "Add to calendar")}
        </Button>
      </div>
    </form>
  );
}

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
