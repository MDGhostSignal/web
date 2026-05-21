"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/admin";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/marketing-assets-types";
import type {
  MarketingAssetCategory,
  MarketingAssetRow,
} from "@/lib/marketing-assets-types";

import styles from "../marketing.module.css";

import { TagInput } from "./TagInput";

type Props = {
  /** Pass the row to edit; omit for "create" mode. */
  initial?: MarketingAssetRow | null;
  onSubmit: (payload: {
    title: string;
    description: string | null;
    category: MarketingAssetCategory;
    tags: string[];
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

/**
 * Form for creating or editing an asset's metadata. Doesn't handle
 * file variants — those go through VariantUpload after the asset is
 * created.
 */
export function AssetForm({ initial, onSubmit, onCancel, submitLabel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<MarketingAssetCategory>(
    initial?.category ?? "brand",
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (title.trim().length === 0) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        category,
        tags,
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
        <span className={styles.formLabel}>Title</span>
        <input
          type="text"
          className={styles.formInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          autoFocus
        />
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Description</span>
        <textarea
          className={styles.formInput}
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>

      <div className={styles.formRow}>
        <label className={styles.formField}>
          <span className={styles.formLabel}>Category</span>
          <select
            className={styles.formInput}
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as MarketingAssetCategory)
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.formField}>
        <span className={styles.formLabel}>Tags</span>
        <TagInput
          value={tags}
          onChange={setTags}
          placeholder="Add a tag and press Enter…"
        />
      </div>

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
          {submitting ? "Saving…" : (submitLabel ?? "Save")}
        </Button>
      </div>
    </form>
  );
}
