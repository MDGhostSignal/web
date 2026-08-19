"use client";

import { useCallback, useState } from "react";

import { Button, Modal } from "@/components/admin";
import { isUsTimezone, type UsTimezoneId } from "@/lib/timezone";

import { ScheduleFields, type ScheduleResolution } from "./ScheduleFields";
import styles from "../outreach.module.css";

/**
 * Reschedule a queued cold-outreach send to a new instant. Reuses the
 * same picker as the composer, seeded with the row's current time, and
 * PATCHes /api/admin/outreach/[id] (which reschedules it at Resend).
 */
export function RescheduleModal({
  row,
  peers,
  onClose,
  onDone,
}: {
  row: { id: string; email: string; scheduled_at: string | null; recipient_tz: string | null };
  /** Other scheduled sends' epoch-ms (this row excluded) for stagger. */
  peers: number[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [schedule, setSchedule] = useState<ScheduleResolution>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onResolve = useCallback((r: ScheduleResolution) => setSchedule(r), []);

  const initialTz: UsTimezoneId =
    row.recipient_tz && isUsTimezone(row.recipient_tz)
      ? row.recipient_tz
      : "America/New_York";
  const initial = row.scheduled_at
    ? { utc: new Date(row.scheduled_at), tz: initialTz }
    : undefined;

  async function confirm() {
    if (!schedule) {
      setError("Pick a valid new time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/outreach/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: schedule.utc.toISOString(),
          recipientTz: schedule.tz,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Reschedule failed (${res.status}).`);
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      size="sm"
      dismissible={!busy}
      title="Reschedule reachout"
      subtitle={`Pick a new arrival time for ${row.email}.`}
    >
      <div className={styles.form}>
        {error && <div className={styles.formError}>{error}</div>}
        <ScheduleFields peers={peers} initial={initial} onResolve={onResolve} />
        <div className={styles.formActions}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void confirm()}
            disabled={busy || !schedule}
          >
            {busy ? "Rescheduling…" : "Reschedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
