"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/admin";
import {
  KIND_LABELS,
  KINDS,
  PERSONA_LABELS,
  PERSONAS,
} from "@/lib/copy-snippets-types";
import type {
  CopySnippetKind,
  CopySnippetPersona,
  CopySnippetRow,
} from "@/lib/copy-snippets-types";

import { TagInput } from "../TagInput";
import styles from "../../marketing.module.css";

type Props = {
  initial?: CopySnippetRow | null;
  onSubmit: (payload: {
    text: string;
    kind: CopySnippetKind;
    persona: CopySnippetPersona;
    source: string | null;
    tags: string[];
    favorite: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  submitLabel?: string;
};

/**
 * Create / edit form for a copy snippet. Big text area for the
 * phrase itself, then metadata fields (kind, persona, source,
 * tags, favorite). Delete button shows up in edit mode only.
 */
export function SnippetForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel,
}: Props) {
  const [text, setText] = useState(initial?.text ?? "");
  const [kind, setKind] = useState<CopySnippetKind>(initial?.kind ?? "tagline");
  const [persona, setPersona] = useState<CopySnippetPersona>(
    initial?.persona ?? "both",
  );
  const [source, setSource] = useState(initial?.source ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (text.trim().length === 0) {
      setError("Text is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        text: text.trim(),
        kind,
        persona,
        source: source.trim() || null,
        tags,
        favorite,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!onDelete) return;
    if (!window.confirm("Delete this snippet? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.formField}>
        <span className={styles.formLabel}>Text</span>
        <textarea
          className={styles.formInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          required
          autoFocus
        />
      </label>

      <div className={styles.formRow}>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Kind</span>
          <select
            className={styles.formInput}
            value={kind}
            onChange={(e) => setKind(e.target.value as CopySnippetKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.formField}>
          <span className={styles.formLabel}>Persona</span>
          <select
            className={styles.formInput}
            value={persona}
            onChange={(e) => setPersona(e.target.value as CopySnippetPersona)}
          >
            {PERSONAS.map((p) => (
              <option key={p} value={p}>
                {PERSONA_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Source (optional)</span>
        <input
          type="text"
          className={styles.formInput}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="/for-creators/page.tsx:221 or social_media_posts.md"
          maxLength={500}
        />
      </label>

      <div className={styles.formField}>
        <span className={styles.formLabel}>Tags</span>
        <TagInput
          value={tags}
          onChange={setTags}
          placeholder="Add a tag and press Enter…"
        />
      </div>

      <label className={styles.copyFavToggle}>
        <input
          type="checkbox"
          checked={favorite}
          onChange={(e) => setFavorite(e.target.checked)}
        />
        Favorite (pin to top of list)
      </label>

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.formActions}>
        {onDelete && (
          <Button
            variant="destructive"
            type="button"
            onClick={handleDelete}
            disabled={submitting || deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
        <Button
          variant="ghost"
          type="button"
          onClick={onCancel}
          disabled={submitting || deleting}
        >
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={submitting || deleting}>
          {submitting ? "Saving…" : (submitLabel ?? "Save")}
        </Button>
      </div>
    </form>
  );
}
