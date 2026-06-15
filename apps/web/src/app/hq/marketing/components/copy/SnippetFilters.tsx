"use client";

import { SearchInput } from "@/components/admin";
import {
  KIND_LABELS,
  KINDS,
  PERSONA_LABELS,
  PERSONAS,
} from "@/lib/copy-snippets-types";
import type {
  CopySnippetKind,
  CopySnippetPersona,
} from "@/lib/copy-snippets-types";

import styles from "../../marketing.module.css";

export type CopyFilters = {
  search: string;
  kind: CopySnippetKind | "all";
  persona: CopySnippetPersona | "all";
  favoritesOnly: boolean;
};

type Props = {
  value: CopyFilters;
  onChange: (next: CopyFilters) => void;
};

/**
 * Filter row above the snippet list: search + kind dropdown +
 * persona dropdown + favorites toggle. All client-side filtering;
 * the parent owns the full snippet list and applies these filters
 * in a useMemo.
 */
export function SnippetFilters({ value, onChange }: Props) {
  function update<K extends keyof CopyFilters>(
    key: K,
    next: CopyFilters[K],
  ): void {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className={styles.copyFilters}>
      <SearchInput
        value={value.search}
        onChange={(e) => update("search", e.target.value)}
        placeholder="Search copy…"
      />

      <select
        className={styles.formInput}
        value={value.kind}
        onChange={(e) =>
          update("kind", e.target.value as CopySnippetKind | "all")
        }
        aria-label="Filter by kind"
      >
        <option value="all">All kinds</option>
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_LABELS[k]}
          </option>
        ))}
      </select>

      <select
        className={styles.formInput}
        value={value.persona}
        onChange={(e) =>
          update("persona", e.target.value as CopySnippetPersona | "all")
        }
        aria-label="Filter by persona"
      >
        <option value="all">All personas</option>
        {PERSONAS.map((p) => (
          <option key={p} value={p}>
            {PERSONA_LABELS[p]}
          </option>
        ))}
      </select>

      <label className={styles.copyFavToggle}>
        <input
          type="checkbox"
          checked={value.favoritesOnly}
          onChange={(e) => update("favoritesOnly", e.target.checked)}
        />
        Favorites only
      </label>
    </div>
  );
}
