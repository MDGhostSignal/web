"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Modal, PageHeader } from "@/components/admin";
import "@/components/admin/tokens.css";

import styles from "./notebook.module.css";

/**
 * /admin/tasks/notebook — a plain-text scratch notebook. Full-size
 * editor with Google-Sheets-style bottom tabs: switch, add (+),
 * double-click to rename, × to delete. Each page is a row in
 * `notebook_docs`; bodies autosave (debounced) via the notebook API.
 */

type Doc = { id: string; title: string; body: string };
type SaveState = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 800;

export default function NotebookPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // The page queued for deletion — drives the confirm modal.
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docsRef = useRef(docs);
  docsRef.current = docs;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/notebook", { cache: "no-store" });
        const json = (await res.json()) as {
          tableMissing?: boolean;
          docs?: Array<{ id: string; title: string; body: string }>;
        };
        if (cancelled) return;
        if (json.tableMissing) setTableMissing(true);
        const list: Doc[] = (json.docs ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          body: d.body ?? "",
        }));
        setDocs(list);
        setActiveId(list[0]?.id ?? null);
      } catch {
        /* leave empty; the setup hint / save errors surface the problem */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = docs.find((d) => d.id === activeId) ?? null;

  const saveBody = useCallback(async (id: string) => {
    const doc = docsRef.current.find((d) => d.id === id);
    if (!doc) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/notebook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, body: doc.body }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  const scheduleSave = useCallback(
    (id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void saveBody(id), AUTOSAVE_MS);
    },
    [saveBody],
  );

  const flushSave = useCallback(
    (id: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void saveBody(id);
      }
    },
    [saveBody],
  );

  function onEdit(value: string) {
    if (!activeId) return;
    setDocs((prev) =>
      prev.map((d) => (d.id === activeId ? { ...d, body: value } : d)),
    );
    setSaveState("idle");
    scheduleSave(activeId);
  }

  function switchTo(id: string) {
    if (id === activeId) return;
    if (activeId) flushSave(activeId);
    setActiveId(id);
    setSaveState("idle");
  }

  async function addPage() {
    try {
      const res = await fetch("/api/admin/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        doc?: { id: string; title: string; body: string };
      };
      if (!res.ok || !json.doc) {
        setSaveState("error");
        return;
      }
      const doc: Doc = {
        id: json.doc.id,
        title: json.doc.title,
        body: json.doc.body ?? "",
      };
      setDocs((prev) => [...prev, doc]);
      setActiveId(doc.id);
      // Drop straight into rename so the new tab gets a name.
      setRenameDraft(doc.title);
      setRenamingId(doc.id);
    } catch {
      setSaveState("error");
    }
  }

  function startRename(doc: Doc) {
    setRenameDraft(doc.title);
    setRenamingId(doc.id);
  }

  async function commitRename() {
    const id = renamingId;
    if (!id) return;
    const title = renameDraft.trim() || "Untitled";
    setRenamingId(null);
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
    try {
      await fetch("/api/admin/notebook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
    } catch {
      /* best-effort; local title still updated */
    }
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    const next = docs.filter((d) => d.id !== target.id);
    setDocs(next);
    if (activeId === target.id) setActiveId(next[0]?.id ?? null);
    try {
      await fetch(`/api/admin/notebook?id=${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
    } catch {
      /* best-effort */
    }
  }

  useEffect(() => {
    const onHide = () => {
      if (timerRef.current && activeId) flushSave(activeId);
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [activeId, flushSave]);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "";

  return (
    <div className={styles.page}>
      <PageHeader
        title="Notebook"
        subtitle="Plain-text scratch space. Switch pages with the tabs below; changes autosave."
        actions={
          saveLabel ? (
            <span
              className={[
                styles.saveStatus,
                saveState === "error" ? styles.saveStatusError : "",
                saveState === "saved" ? styles.saveStatusSaved : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {saveLabel}
            </span>
          ) : null
        }
      />

      {tableMissing && (
        <div className={styles.setupHint}>
          Notebook storage isn&apos;t set up yet. Run{" "}
          <code>docs/NOTEBOOK_SUPABASE_SCHEMA.sql</code> in Supabase, then
          reload — pages and edits will save after that.
        </div>
      )}

      <div className={styles.editorWrap}>
        {active ? (
          <textarea
            className={styles.editor}
            value={active.body}
            onChange={(e) => onEdit(e.target.value)}
            placeholder={`Start writing your ${active.title}…`}
            spellCheck
            aria-label={active.title}
          />
        ) : (
          <div className={styles.emptyState}>
            {loading
              ? "Loading…"
              : tableMissing
                ? "Set up storage above to start writing."
                : "No pages yet — add one with the + below."}
          </div>
        )}
      </div>

      {/* Google-Sheets-style page tabs, pinned to the bottom. */}
      <div className={styles.tabBar} role="tablist" aria-label="Notebook pages">
        {docs.map((d) => {
          const isActive = d.id === activeId;
          const isRenaming = d.id === renamingId;
          return (
            <div
              key={d.id}
              className={[styles.tab, isActive ? styles.tabActive : ""]
                .filter(Boolean)
                .join(" ")}
              role="tab"
              aria-selected={isActive}
              onClick={() => !isRenaming && switchTo(d.id)}
              onDoubleClick={() => startRename(d)}
            >
              {isRenaming ? (
                <input
                  className={styles.tabRenameInput}
                  value={renameDraft}
                  autoFocus
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => void commitRename()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Rename page"
                />
              ) : (
                <>
                  <span className={styles.tabLabel}>{d.title}</span>
                  <button
                    type="button"
                    className={styles.tabClose}
                    aria-label={`Delete ${d.title}`}
                    title="Delete page"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(d);
                    }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className={styles.tabAdd}
          onClick={() => void addPage()}
          disabled={tableMissing}
          title={
            tableMissing ? "Set up storage first" : "Add a page"
          }
          aria-label="Add a page"
        >
          +
        </button>
      </div>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete page"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructiveSolid"
              onClick={() => void confirmDelete()}
            >
              Delete page
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Delete <strong>{pendingDelete?.title}</strong>? This can&apos;t be
          undone.
        </p>
      </Modal>
    </div>
  );
}
