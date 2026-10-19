"use client";

import { useEffect, useState } from "react";

import { Button, ErrorCard, Loading, PageHeader } from "@/components/admin";

import { HorizonBoard } from "./components/HorizonBoard";
import {
  GoalEditor,
  draftFromGoal,
  emptyDraft,
  type Draft,
} from "./components/GoalEditor";
import {
  CADENCE_LABEL,
  type Cadence,
  type Goal,
  type Horizon,
} from "./types";
import styles from "./horizon.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; goals: Goal[]; tableMissing: boolean };

export default function HorizonPage() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [refresh, setRefresh] = useState(0);
  const [cadence, setCadence] = useState<"all" | Cadence>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/horizon");
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          tableMissing?: boolean;
          goals?: Goal[];
        };
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setLoad({
            status: "error",
            message: body.error || "Could not load the horizon.",
          });
          return;
        }
        setLoad({
          status: "ready",
          goals: body.goals ?? [],
          tableMissing: Boolean(body.tableMissing),
        });
      } catch {
        if (!cancelled) {
          setLoad({ status: "error", message: "Could not load the horizon." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const goals = load.status === "ready" ? load.goals : [];

  async function save() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setFormError("Give the goal a title.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      title,
      note: draft.note,
      horizon: draft.horizon,
      cadence: draft.cadence,
      status: draft.status,
      parent_id: draft.parent_id || null,
      owner: draft.owner,
    };
    const res = await fetch("/api/admin/horizon", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft.id ? { id: draft.id, ...payload } : payload),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    setSaving(false);
    if (!res.ok || !body.ok) {
      setFormError(body.error || "Save failed.");
      return;
    }
    setDraft(null);
    setRefresh((n) => n + 1);
  }

  async function remove() {
    if (!draft?.id) return;
    setSaving(true);
    const res = await fetch(
      `/api/admin/horizon?id=${encodeURIComponent(draft.id)}`,
      { method: "DELETE" },
    );
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setFormError(body.error || "Delete failed.");
      return;
    }
    setDraft(null);
    setRefresh((n) => n + 1);
  }

  async function move(id: string, horizon: Horizon, beforeId: string | null) {
    if (load.status !== "ready") return;
    const next = load.goals.map((goal) => ({ ...goal }));
    const moving = next.find((goal) => goal.id === id);
    if (!moving) return;
    moving.horizon = horizon;
    const band = next
      .filter((goal) => goal.horizon === horizon && goal.id !== id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const index = beforeId ? band.findIndex((goal) => goal.id === beforeId) : band.length;
    band.splice(index < 0 ? band.length : index, 0, moving);
    const items = band.map((goal, sort_order) => {
      goal.sort_order = sort_order;
      return { id: goal.id, horizon, sort_order };
    });
    setLoad({ ...load, goals: next });
    const res = await fetch("/api/admin/horizon/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) setRefresh((n) => n + 1);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Horizon"
        subtitle="Where the company is going, from this week to the long view."
        actions={
          <Button
            variant="primary"
            size="sm"
            disabled={load.status !== "ready" || load.tableMissing}
            onClick={() => {
              setFormError(null);
              setDraft(emptyDraft());
            }}
          >
            New goal
          </Button>
        }
        toolbar={
          <div className={styles.chips}>
            {(["all", "week", "month", "year"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={cadence === key ? styles.chipOn : styles.chip}
                onClick={() => setCadence(key)}
              >
                {key === "all" ? "All" : CADENCE_LABEL[key]}
              </button>
            ))}
          </div>
        }
      />

      {load.status === "loading" ? <Loading /> : null}
      {load.status === "error" ? (
        <ErrorCard title="Horizon is unavailable">
          <p>{load.message}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoad({ status: "loading" });
              setRefresh((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </ErrorCard>
      ) : null}

      {load.status === "ready" && load.tableMissing ? (
        <p className={styles.setup}>
          Run <code>docs/HORIZON_SUPABASE_SCHEMA.sql</code> in the Supabase SQL
          editor, then reload. The board stays empty until that table exists.
        </p>
      ) : null}

      {load.status === "ready" && !load.tableMissing ? (
        <>
          {goals.length === 0 ? (
            <p className={styles.setup}>
              No goals yet. Add the first card, or bring them over from the
              company goals document.
            </p>
          ) : null}
          <HorizonBoard
            goals={goals}
            cadence={cadence}
            onOpen={(goal) => {
              setFormError(null);
              setDraft(draftFromGoal(goal));
            }}
            onMove={move}
          />
        </>
      ) : null}

      {draft ? (
        <GoalEditor
          draft={draft}
          goals={goals}
          saving={saving}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={save}
          onDelete={remove}
          error={formError}
        />
      ) : null}
    </div>
  );
}
