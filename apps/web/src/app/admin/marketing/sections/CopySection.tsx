"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  ErrorCard,
  Loading,
  Modal,
} from "@/components/admin";
import type { CopySnippetRow } from "@/lib/copy-snippets-types";

import {
  SnippetFilters,
  type CopyFilters,
} from "../components/copy/SnippetFilters";
import { SnippetForm } from "../components/copy/SnippetForm";
import { SnippetList } from "../components/copy/SnippetList";
import styles from "../marketing.module.css";

type ListResponse = {
  ok: true;
  snippets: CopySnippetRow[];
  count: number;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const DEFAULT_FILTERS: CopyFilters = {
  search: "",
  kind: "all",
  persona: "all",
  favoritesOnly: false,
};

/**
 * Copy Library section. Fetches all snippets in one round-trip
 * (catalog is small — ≤500 entries) and applies filters client-side
 * for instant response. Includes a create modal and an edit modal
 * that doubles as the delete affordance.
 */
export function CopySection() {
  const [snippets, setSnippets] = useState<CopySnippetRow[]>([]);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [filters, setFilters] = useState<CopyFilters>(DEFAULT_FILTERS);
  const [editing, setEditing] = useState<CopySnippetRow | null>(null);
  const [creating, setCreating] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketing-copy?limit=1000", {
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status} — ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as ListResponse;
      setSnippets(json.snippets);
      setState({ kind: "ready" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return snippets.filter((s) => {
      if (filters.kind !== "all" && s.kind !== filters.kind) return false;
      if (filters.persona !== "all" && s.persona !== filters.persona)
        return false;
      if (filters.favoritesOnly && !s.favorite) return false;
      if (q && !s.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [snippets, filters]);

  async function handleCreate(payload: {
    text: string;
    kind: CopySnippetRow["kind"];
    persona: CopySnippetRow["persona"];
    source: string | null;
    tags: string[];
    favorite: boolean;
  }): Promise<void> {
    const res = await fetch("/api/admin/marketing-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Create failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    setCreating(false);
    await loadList();
  }

  async function handlePatch(
    id: string,
    patch: Partial<CopySnippetRow>,
  ): Promise<void> {
    const res = await fetch(
      `/api/admin/marketing-copy/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Save failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    await loadList();
  }

  async function handleEditSubmit(payload: {
    text: string;
    kind: CopySnippetRow["kind"];
    persona: CopySnippetRow["persona"];
    source: string | null;
    tags: string[];
    favorite: boolean;
  }): Promise<void> {
    if (!editing) return;
    await handlePatch(editing.id, payload);
    setEditing(null);
  }

  async function handleEditDelete(): Promise<void> {
    if (!editing) return;
    const res = await fetch(
      `/api/admin/marketing-copy/${encodeURIComponent(editing.id)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Delete failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    setEditing(null);
    await loadList();
  }

  async function handleToggleFavorite(s: CopySnippetRow): Promise<void> {
    // Optimistic flip in local state, then patch.
    setSnippets((prev) =>
      prev.map((row) =>
        row.id === s.id ? { ...row, favorite: !row.favorite } : row,
      ),
    );
    try {
      await handlePatch(s.id, { favorite: !s.favorite });
    } catch {
      // Roll back on failure.
      setSnippets((prev) =>
        prev.map((row) =>
          row.id === s.id ? { ...row, favorite: s.favorite } : row,
        ),
      );
    }
  }

  return (
    <>
      <div className={styles.sectionToolbar}>
        <div className={styles.sectionMeta}>
          {snippets.length}{" "}
          {snippets.length === 1 ? "snippet" : "snippets"}
          {filtered.length !== snippets.length && (
            <span className={styles.sectionMetaDim}>
              {" "}
              · {filtered.length} matching
            </span>
          )}
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          Add snippet
        </Button>
      </div>

      {state.kind === "loading" && <Loading message="Loading copy…" />}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load copy">
          <p>{state.message}</p>
          <p>
            <button
              type="button"
              onClick={() => {
                setState({ kind: "loading" });
                loadList();
              }}
            >
              Retry
            </button>
          </p>
        </ErrorCard>
      )}

      {state.kind === "ready" && (
        <>
          <SnippetFilters value={filters} onChange={setFilters} />

          {snippets.length === 0 ? (
            <EmptyState
              title="No copy snippets yet"
              message={
                <>
                  Run the seed script to import the canonical phrases:
                  <br />
                  <code>
                    cd apps/web &amp;&amp; node scripts/seed-copy-snippets.mjs
                  </code>
                  <br />
                  Or click <strong>Add snippet</strong> to add your first by hand.
                </>
              }
            />
          ) : (
            <SnippetList
              snippets={filtered}
              onEdit={(s) => setEditing(s)}
              onToggleFavorite={(s) => void handleToggleFavorite(s)}
            />
          )}
        </>
      )}

      {creating && (
        <Modal
          open
          title="Add snippet"
          onClose={() => setCreating(false)}
          size="md"
        >
          <SnippetForm
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitLabel="Create"
          />
        </Modal>
      )}

      {editing && (
        <Modal
          open
          title="Edit snippet"
          onClose={() => setEditing(null)}
          size="md"
        >
          <SnippetForm
            initial={editing}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditing(null)}
            onDelete={handleEditDelete}
            submitLabel="Save changes"
          />
        </Modal>
      )}
    </>
  );
}
