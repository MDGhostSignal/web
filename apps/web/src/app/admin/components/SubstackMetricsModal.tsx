"use client";

import { useState, type FormEvent } from "react";

import { Button, Modal } from "@/components/admin";

import type { SubstackMetricsRow } from "@/app/api/admin/substack-metrics/route";

import styles from "./SubstackMetricsModal.module.css";

type Props = {
  open: boolean;
  initial: SubstackMetricsRow | null;
  /** Views already recorded for today (daily series), if any. */
  viewsToday?: number | null;
  onClose: () => void;
  onSaved: (row: SubstackMetricsRow) => void;
};

/**
 * Manual Substack metrics updater for the Dashboard home card.
 * Upserts today's daily point + optional official lifetime views total.
 */
export function SubstackMetricsModal({
  open,
  initial,
  viewsToday = null,
  onClose,
  onSaved,
}: Props) {
  const [subscribers, setSubscribers] = useState(
    initial ? String(initial.subscriber_count) : "",
  );
  const [lifetimeViews, setLifetimeViews] = useState(
    initial ? String(initial.total_views) : "",
  );
  const [dayViews, setDayViews] = useState(
    viewsToday != null ? String(viewsToday) : "0",
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
          views: dayViews,
          lifetime_views: lifetimeViews,
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
      subtitle="Subscribers and lifetime views should match Substack Stats. Daily views feed the chart."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={
              saving ||
              subscribers.trim() === "" ||
              lifetimeViews.trim() === ""
            }
          >
            {saving ? "Saving…" : "Save"}
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
            <span className={styles.label}>Lifetime views (Substack)</span>
            <input
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              value={lifetimeViews}
              onChange={(e) => setLifetimeViews(e.target.value)}
              placeholder="951"
            />
          </label>
        </div>
        <label className={styles.formGroupFull}>
          <span className={styles.label}>Views today (optional)</span>
          <input
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={dayViews}
            onChange={(e) => setDayViews(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className={styles.formGroupFull}>
          <span className={styles.label}>Note (optional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. From Substack Stats"
            rows={3}
            maxLength={500}
          />
        </label>
        <p className={styles.hint}>
          Lifetime views drive the Views → All time number. The traffic CSV
          daily series is only for the chart shape — it can disagree with
          Substack&apos;s lifetime total.
        </p>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </Modal>
  );
}
