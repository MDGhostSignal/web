"use client";

import { useState, type KeyboardEvent } from "react";

import { Badge } from "@/components/admin";

import styles from "../marketing.module.css";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

/**
 * Chip-style tag editor.
 *  - Enter or comma commits the current input as a new tag.
 *  - Backspace on empty input removes the last tag.
 *  - Duplicates are silently de-duped.
 *  - 50-char max per tag; 20 tags max — soft-enforced for sanity.
 */
export function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  function commit(raw: string): void {
    const tag = raw.trim().slice(0, 50);
    if (!tag) return;
    if (value.includes(tag)) {
      setDraft("");
      return;
    }
    if (value.length >= 20) return;
    onChange([...value, tag]);
    setDraft("");
  }

  function remove(tag: string): void {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className={styles.tagInput}>
      {value.map((t) => (
        <span key={t} className={styles.tagChip}>
          <Badge variant="neutral">{t}</Badge>
          <button
            type="button"
            className={styles.tagChipRemove}
            onClick={() => remove(t)}
            aria-label={`Remove tag ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        className={styles.tagInputField}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? (placeholder ?? "Add tag…") : ""}
      />
    </div>
  );
}
