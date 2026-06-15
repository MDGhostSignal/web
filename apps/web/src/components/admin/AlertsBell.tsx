"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { ALERT_KIND_LABELS, type AlertKind, type CrmAlert } from "@/lib/alerts";

import { IconBell } from "./icons";
import styles from "./AlertsBell.module.css";

type AlertWithSubject = CrmAlert & {
  member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    owner: string | null;
    phase: string;
    organization: string | null;
  } | null;
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    created_by: string | null;
  } | null;
};

/** Background poll cadence for the unread count badge. 60s is the
 *  sweet spot: cheap enough to not burn requests, fresh enough that a
 *  founder doesn't sit on a stale badge for long. */
const POLL_MS = 60_000;

/** Best-link target per alert. */
function alertHref(a: AlertWithSubject): string {
  if (a.kind === "marketplace_stall") return "/hq/marketplace?view=pool";
  if (a.kind === "task_stale") return "/hq/tasks";
  if (a.kind === "contract_expiring") return "/hq/marketplace?view=pool";
  return "/hq/contacts";
}

function subjectLabel(a: AlertWithSubject): string {
  if (a.task) return a.task.title || "Untitled task";
  const m = a.member;
  if (!m) return "Unknown";
  const n = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return n || m.organization || "Unnamed";
}

function subjectOwner(a: AlertWithSubject): string | null {
  if (a.member) return a.member.owner;
  if (a.task) return a.task.assigned_to ?? a.task.created_by ?? null;
  return null;
}

function ageLabel(a: AlertWithSubject): string {
  const r = a.reason_json;
  if (a.kind === "contact_cold" && typeof r.days_since_last_contact === "number") {
    return `${r.days_since_last_contact}d cold`;
  }
  if (a.kind === "marketplace_stall" && typeof r.days_in_phase === "number") {
    return `${r.days_in_phase}d in phase`;
  }
  if (a.kind === "task_stale" && typeof r.days_since_update === "number") {
    return `${r.days_since_update}d untouched`;
  }
  if (a.kind === "contract_expiring" && typeof r.days_until_renewal === "number") {
    if (r.days_until_renewal < 0) return `expired ${Math.abs(r.days_until_renewal)}d ago`;
    if (r.days_until_renewal === 0) return "renews today";
    return `renews in ${r.days_until_renewal}d`;
  }
  return "—";
}

/**
 * AlertsBell — top-bar notification widget.
 *
 * Lives in `AdminShell`'s `trail` slot. Polls /api/admin/alerts/count
 * every 60s for the badge; loads the full list lazily when the panel
 * opens so we don't pay for the join on every page render.
 *
 * Per-row actions: Resolve (mark done) and Snooze 7d. Both mutate via
 * /api/admin/alerts/[id] and optimistically remove the row from the
 * panel so the user sees instant feedback.
 */
export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState<AlertWithSubject[] | null>(null);

  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/alerts/count");
      if (!r.ok) return;
      const j = await r.json();
      if (typeof j.count === "number") setCount(j.count);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/alerts");
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.alerts)) {
        setAlerts(j.alerts as AlertWithSubject[]);
        setCount(j.alerts.length);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  // Initial count load + polling.
  useEffect(() => {
    void fetchCount();
    const id = window.setInterval(fetchCount, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchCount]);

  // Hydrate the list when the panel opens.
  useEffect(() => {
    if (open) void fetchAlerts();
  }, [open, fetchAlerts]);

  // Click-outside + Escape to close.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function act(id: string, action: "resolve" | "snooze") {
    // Optimistic: remove the row.
    setAlerts((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
    setCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "snooze" ? { action, snooze_days: 7 } : { action },
        ),
      });
    } catch {
      // On failure, refetch to recover state.
      void fetchAlerts();
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${count} open)`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <IconBell className={styles.triggerIcon} />
        {count > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="Notifications"
        >
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              Alerts {count > 0 && `(${count})`}
            </h2>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => void fetchAlerts()}
              disabled={busy}
            >
              {busy ? "Loading…" : "Refresh"}
            </button>
          </header>

          <div className={styles.list}>
            {alerts === null ? (
              <p className={styles.emptyState}>Loading…</p>
            ) : alerts.length === 0 ? (
              <p className={styles.emptyState}>
                All clear. No open alerts right now.
              </p>
            ) : (
              alerts.slice(0, 8).map((a) => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  onResolve={() => void act(a.id, "resolve")}
                  onSnooze={() => void act(a.id, "snooze")}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>

          <footer className={styles.panelFooter}>
            <Link
              href="/hq/alerts"
              className={styles.viewAllLink}
              onClick={() => setOpen(false)}
            >
              View all alerts →
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  onResolve,
  onSnooze,
  onNavigate,
}: {
  alert: AlertWithSubject;
  onResolve: () => void;
  onSnooze: () => void;
  onNavigate: () => void;
}) {
  const kindClass =
    alert.kind === "contact_cold"
      ? styles.contact
      : alert.kind === "marketplace_stall"
        ? styles.stall
        : alert.kind === "task_stale"
          ? styles.task
          : styles.contract;
  const owner = subjectOwner(alert);
  return (
    <Link
      href={alertHref(alert)}
      className={styles.row}
      onClick={onNavigate}
    >
      <div className={styles.rowMain}>
        <span className={`${styles.rowKind} ${kindClass}`}>
          {ALERT_KIND_LABELS[alert.kind as AlertKind]}
        </span>
        <span className={styles.rowName}>{subjectLabel(alert)}</span>
        <span className={styles.rowMeta}>
          <span>{ageLabel(alert)}</span>
          {owner && <span>· {owner}</span>}
        </span>
      </div>
      <div
        className={styles.rowActions}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          className={styles.miniBtn}
          onClick={onSnooze}
          title="Snooze 7 days"
        >
          7d
        </button>
        <button
          type="button"
          className={`${styles.miniBtn} ${styles.resolve}`}
          onClick={onResolve}
          title="Mark resolved"
        >
          ✓
        </button>
      </div>
    </Link>
  );
}
