"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/admin";
import "@/components/admin/tokens.css";

import styles from "./notebook.module.css";

/**
 * /admin/tasks/notebook — a plain-text scratch notebook. Full-size
 * editor with Google-Sheets-style bottom tabs to switch between pages.
 * Two fixed pages today (Business plan / Notes); each is one row in
 * `notebook_docs`, autosaved (debounced) via PUT /api/admin/notebook.
 */

const PAGES = [
  { slug: "business_plan", label: "Business plan" },
  { slug: "notes", label: "Notes" },
] as const;
type Slug = (typeof PAGES)[number]["slug"];

type SaveState = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_MS = 800;

export default function NotebookPage() {
  const [bodies, setBodies] = useState<Record<Slug, string>>({
    business_plan: "",
    notes: "",
  });
  const [active, setActive] = useState<Slug>("business_plan");
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest bodies, readable inside debounced callbacks without stale
  // closures.
  const bodiesRef = useRef(bodies);
  bodiesRef.current = bodies;

  // Initial load — both docs at once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/notebook", { cache: "no-store" });
        const json = (await res.json()) as {
          ok: boolean;
          tableMissing?: boolean;
          docs?: Record<string, { body: string }>;
        };
        if (cancelled) return;
        if (json.tableMissing) setTableMissing(true);
        if (json.docs) {
          setBodies({
            business_plan: json.docs.business_plan?.body ?? "",
            notes: json.docs.notes?.body ?? "",
          });
        }
      } catch {
        /* leave the editor empty; save will surface any error */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (slug: Slug) => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/notebook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, body: bodiesRef.current[slug] }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  const scheduleSave = useCallback(
    (slug: Slug) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void save(slug), AUTOSAVE_MS);
    },
    [save],
  );

  const flushSave = useCallback(
    (slug: Slug) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void save(slug);
      }
    },
    [save],
  );

  function onEdit(value: string) {
    setBodies((prev) => ({ ...prev, [active]: value }));
    setSaveState("idle");
    scheduleSave(active);
  }

  function switchTo(slug: Slug) {
    if (slug === active) return;
    flushSave(active); // don't lose pending edits on the outgoing page
    setActive(slug);
    setSaveState("idle");
  }

  // Flush a pending save when the tab/window is hidden.
  useEffect(() => {
    const onHide = () => {
      if (timerRef.current) flushSave(active);
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [active, flushSave]);

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
          reload. You can still type below, but changes won&apos;t save until
          then.
        </div>
      )}

      <div className={styles.editorWrap}>
        <textarea
          className={styles.editor}
          value={bodies[active]}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={
            loading ? "Loading…" : `Start writing your ${labelFor(active)}…`
          }
          spellCheck
          aria-label={labelFor(active)}
        />
      </div>

      {/* Google-Sheets-style page tabs, pinned to the bottom. */}
      <div className={styles.tabBar} role="tablist" aria-label="Notebook pages">
        {PAGES.map((p) => (
          <button
            key={p.slug}
            type="button"
            role="tab"
            aria-selected={active === p.slug}
            className={[
              styles.tab,
              active === p.slug ? styles.tabActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => switchTo(p.slug)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function labelFor(slug: Slug): string {
  return PAGES.find((p) => p.slug === slug)?.label ?? "notes";
}
