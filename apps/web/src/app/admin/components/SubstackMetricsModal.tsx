"use client";

import { useState, type FormEvent } from "react";

import { Button, Modal } from "@/components/admin";

import type { SubstackMetricsRow } from "@/app/api/admin/substack-metrics/route";

import styles from "./SubstackMetricsModal.module.css";

type Props = {
  open: boolean;
  initial: SubstackMetricsRow | null;
  onClose: () => void;
  onSaved: (row: SubstackMetricsRow) => void;
};

/**
 * Manual Substack metrics updater for the Dashboard home card.
 * Saves by inserting a new snapshot (append-only history).
 *
 * Parent should remount this when opening (e.g. `{open && <Modal…/>}`)
 * so the form state snapshots `initial` via useState initializers —
 * avoids react-hooks/set-state-in-effect.
 */
export function SubstackMetricsModal({
  open,
  initial,
  onClose,
  onSaved,
}: Props) {
  const [subscribers, setSubscribers] = useState(
    initial ? String(initial.subscriber_count) : "",
  );
  const [views, setViews] = useState(
    initial ? String(initial.total_views) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/substack-metrics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriber_count: subscribers,
          total_views: views,
          note: note.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        metrics?: SubstackMetricsRow;
      };
      if (!res.ok || !json.ok || !json.metrics) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      onSaved(json.metrics);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      size="md"
      title="Update Substack metrics"
      subtitle="Enter the current numbers from Substack. Each save creates a new snapshot."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={saving || subscribers.trim() === "" || views.trim() === ""}
          >
            {saving ? "Saving…" : "Save snapshot"}
          </Button>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <label className={styles.formGroup}>
            <span className={styles.label}>Subscribers</span>
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              value={subscribers}
              onChange={(e) => setSubscribers(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </label>
          <label className={styles.formGroup}>
            <span className={styles.label}>Total views</span>
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              value={views}
              onChange={(e) => setViews(e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
        <label className={styles.formGroupFull}>
          <span className={styles.label}>Note (optional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Pulled from Substack stats on March 12"
            rows={3}
            maxLength={500}
          />
        </label>
        <p className={styles.hint}>
          Tip: copy these from Substack → Stats (subscribers and lifetime /
          total views).
        </p>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </Modal>
  );
}
