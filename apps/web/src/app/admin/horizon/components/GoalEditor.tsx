"use client";

import { useState } from "react";

import { Button, Modal } from "@/components/admin";

import {
  CADENCE_LABEL,
  HORIZON_META,
  STATUS_LABEL,
  type Cadence,
  type Goal,
  type GoalStatus,
  type Horizon,
} from "../types";
import styles from "../horizon.module.css";

type Draft = {
  id: string | null;
  title: string;
  note: string;
  horizon: Horizon;
  cadence: Cadence;
  status: GoalStatus;
  parent_id: string;
  owner: string;
};

type Props = {
  draft: Draft;
  goals: Goal[];
  saving: boolean;
  onChange: (next: Draft) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  error: string | null;
};

export function emptyDraft(): Draft {
  return {
    id: null,
    title: "",
    note: "",
    horizon: "short",
    cadence: "month",
    status: "on_track",
    parent_id: "",
    owner: "",
  };
}

export function draftFromGoal(goal: Goal): Draft {
  return {
    id: goal.id,
    title: goal.title,
    note: goal.note,
    horizon: goal.horizon,
    cadence: goal.cadence,
    status: goal.status,
    parent_id: goal.parent_id ?? "",
    owner: goal.owner,
  };
}

export function GoalEditor({
  draft,
  goals,
  saving,
  onChange,
  onClose,
  onSave,
  onDelete,
  error,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parents = goals.filter((goal) => goal.id !== draft.id);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!saving}
      title={draft.id ? "Edit goal" : "New goal"}
      subtitle="Cards connect when this goal serves a larger one."
      footer={
        <div className={styles.editorFooter}>
          {draft.id ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={saving}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                onDelete();
              }}
            >
              {confirmDelete ? "Delete this goal" : "Delete"}
            </Button>
          ) : (
            <span />
          )}
          <div className={styles.editorActions}>
            <Button variant="ghost" size="sm" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={saving} onClick={onSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.form}>
        {error ? <p className={styles.formError}>{error}</p> : null}
        <label className={styles.field}>
          <span>Title</span>
          <input
            value={draft.title}
            maxLength={160}
            onChange={(event) => set("title", event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Note</span>
          <textarea
            rows={3}
            maxLength={600}
            value={draft.note}
            onChange={(event) => set("note", event.target.value)}
          />
        </label>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>Horizon</span>
            <select
              value={draft.horizon}
              onChange={(event) => set("horizon", event.target.value as Horizon)}
            >
              {(Object.keys(HORIZON_META) as Horizon[]).map((key) => (
                <option key={key} value={key}>
                  {HORIZON_META[key].label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Cadence</span>
            <select
              value={draft.cadence}
              onChange={(event) => set("cadence", event.target.value as Cadence)}
            >
              {(Object.keys(CADENCE_LABEL) as Cadence[]).map((key) => (
                <option key={key} value={key}>
                  {CADENCE_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) => set("status", event.target.value as GoalStatus)}
            >
              {(Object.keys(STATUS_LABEL) as GoalStatus[]).map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Owner</span>
            <input
              value={draft.owner}
              maxLength={80}
              onChange={(event) => set("owner", event.target.value)}
            />
          </label>
        </div>
        <label className={styles.field}>
          <span>Serves</span>
          <select
            value={draft.parent_id}
            onChange={(event) => set("parent_id", event.target.value)}
          >
            <option value="">Nothing larger yet</option>
            {parents.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}

export type { Draft };
