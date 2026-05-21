"use client";

import { EmptyState } from "@/components/admin";
import { KIND_LABELS, KINDS } from "@/lib/copy-snippets-types";
import type {
  CopySnippetKind,
  CopySnippetRow,
} from "@/lib/copy-snippets-types";

import styles from "../../marketing.module.css";

import { SnippetCard } from "./SnippetCard";

type Props = {
  snippets: CopySnippetRow[];
  onEdit: (snippet: CopySnippetRow) => void;
  onToggleFavorite: (snippet: CopySnippetRow) => void;
};

/**
 * Snippet list grouped by `kind` (tagline, headline, …). Favorites
 * bubble inside each group via the parent's sort. Groups appear in
 * the canonical KINDS order, omitting any group with no entries.
 */
export function SnippetList({ snippets, onEdit, onToggleFavorite }: Props) {
  if (snippets.length === 0) {
    return (
      <EmptyState
        title="No matches"
        message="Try a different filter or clear the search."
      />
    );
  }

  const byKind = groupByKind(snippets);

  return (
    <div className={styles.snippetGroups}>
      {KINDS.map((kind) => {
        const group = byKind.get(kind);
        if (!group || group.length === 0) return null;
        return (
          <section key={kind} className={styles.snippetGroup}>
            <header className={styles.snippetGroupHeader}>
              <h2 className={styles.snippetGroupTitle}>{KIND_LABELS[kind]}</h2>
              <span className={styles.snippetGroupCount}>
                {group.length} {group.length === 1 ? "entry" : "entries"}
              </span>
            </header>
            <div className={styles.snippetGrid}>
              {group.map((s) => (
                <SnippetCard
                  key={s.id}
                  snippet={s}
                  onEdit={() => onEdit(s)}
                  onToggleFavorite={() => onToggleFavorite(s)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function groupByKind(
  snippets: CopySnippetRow[],
): Map<CopySnippetKind, CopySnippetRow[]> {
  const out = new Map<CopySnippetKind, CopySnippetRow[]>();
  for (const s of snippets) {
    const arr = out.get(s.kind) ?? [];
    arr.push(s);
    out.set(s.kind, arr);
  }
  return out;
}
