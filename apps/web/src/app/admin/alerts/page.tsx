"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge, PageHeader } from "@/components/admin";
import {
  ALERT_KIND_LABELS,
  type AlertKind,
  type CrmAlert,
} from "@/lib/alerts";
import { MEMBER_OWNERS, type MemberOwner } from "@/lib/members";

import styles from "./page.module.css";

type AlertWithSubject = CrmAlert & {
  member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
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

type OwnerFilter = "all" | MemberOwner | "unowned";
type KindFilter = "all" | AlertKind;

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
    return `${r.days_since_last_contact} days cold`;
  }
  if (a.kind === "marketplace_stall" && typeof r.days_in_phase === "number") {
    return `${r.days_in_phase} days in phase`;
  }
  if (a.kind === "task_stale" && typeof r.days_since_update === "number") {
    return `${r.days_since_update} days untouched`;
  }
  if (a.kind === "contract_expiring" && typeof r.days_until_renewal === "number") {
    if (r.days_until_renewal < 0) {
      return `expired ${Math.abs(r.days_until_renewal)} days ago`;
    }
    if (r.days_until_renewal === 0) return "renews today";
    return `renews in ${r.days_until_renewal} days`;
  }
  return "—";
}

function alertHref(a: AlertWithSubject): string {
  if (a.kind === "marketplace_stall") return "/admin/marketplace?view=pool";
  if (a.kind === "task_stale") return "/admin/tasks";
  if (a.kind === "contract_expiring") return "/admin/marketplace?view=pool";
  return "/admin/contacts";
}

/**
 * /admin/alerts — full triage page. Lists every open alert across
 * both kinds, filterable by owner + kind. Each row offers Open
 * (navigate), Snooze 7d, and Resolve actions. Manual refresh kicks
 * the sync cron via POST /api/admin/alerts/sync.
 */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertWithSubject[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/alerts");
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.alerts)) setAlerts(j.alerts);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "resolve" | "snooze") {
    setAlerts((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
    try {
      await fetch(`/api/admin/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "snooze" ? { action, snooze_days: 7 } : { action },
        ),
      });
    } catch {
      void load();
    }
  }

  async function syncNow() {
    setBusy(true);
    try {
      await fetch("/api/admin/alerts/sync", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((a) => {
      if (kindFilter !== "all" && a.kind !== kindFilter) return false;
      if (ownerFilter !== "all") {
        const o = subjectOwner(a);
        if (ownerFilter === "unowned") return o === null;
        if (o !== ownerFilter) return false;
      }
      return true;
    });
  }, [alerts, kindFilter, ownerFilter]);

  // Per-owner counts for the pill labels. Use the same owner-resolution
  // rule as the digest so the count matches what gets emailed.
  const ownerCounts = useMemo(() => {
    const m = new Map<string, number>();
    m.set("all", alerts?.length ?? 0);
    let unowned = 0;
    for (const a of alerts ?? []) {
      const o = subjectOwner(a);
      if (!o) {
        unowned += 1;
      } else {
        m.set(o, (m.get(o) ?? 0) + 1);
      }
    }
    m.set("unowned", unowned);
    return m;
  }, [alerts]);

  const kindCounts = useMemo(() => {
    const m = new Map<string, number>();
    m.set("all", alerts?.length ?? 0);
    for (const a of alerts ?? []) m.set(a.kind, (m.get(a.kind) ?? 0) + 1);
    return m;
  }, [alerts]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Alerts"
        subtitle="Nudges for stale contacts and stalled marketplace members. Auto-resolve when you log a comment, update last-contact, or close a lifecycle step."
        count={
          <Badge variant="warn">
            {alerts?.length ?? 0} open
          </Badge>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <button
            className={`${styles.pill} ${kindFilter === "all" ? styles.pillActive : ""}`}
            onClick={() => setKindFilter("all")}
          >
            All kinds
            <span className={styles.pillCount}>{kindCounts.get("all") ?? 0}</span>
          </button>
          <button
            className={`${styles.pill} ${kindFilter === "contact_cold" ? styles.pillActive : ""}`}
            onClick={() => setKindFilter("contact_cold")}
          >
            Contact cold
            <span className={styles.pillCount}>{kindCounts.get("contact_cold") ?? 0}</span>
          </button>
          <button
            className={`${styles.pill} ${kindFilter === "marketplace_stall" ? styles.pillActive : ""}`}
            onClick={() => setKindFilter("marketplace_stall")}
          >
            Marketplace stall
            <span className={styles.pillCount}>{kindCounts.get("marketplace_stall") ?? 0}</span>
          </button>
          <button
            className={`${styles.pill} ${kindFilter === "task_stale" ? styles.pillActive : ""}`}
            onClick={() => setKindFilter("task_stale")}
          >
            Task untouched
            <span className={styles.pillCount}>{kindCounts.get("task_stale") ?? 0}</span>
          </button>
          <button
            className={`${styles.pill} ${kindFilter === "contract_expiring" ? styles.pillActive : ""}`}
            onClick={() => setKindFilter("contract_expiring")}
          >
            Contract renewal
            <span className={styles.pillCount}>{kindCounts.get("contract_expiring") ?? 0}</span>
          </button>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={() => void syncNow()}
          disabled={busy}
        >
          {busy ? "Syncing…" : "Re-scan now"}
        </button>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.pill} ${ownerFilter === "all" ? styles.pillActive : ""}`}
          onClick={() => setOwnerFilter("all")}
        >
          All owners
          <span className={styles.pillCount}>{ownerCounts.get("all") ?? 0}</span>
        </button>
        {MEMBER_OWNERS.map((o) => (
          <button
            key={o}
            className={`${styles.pill} ${ownerFilter === o ? styles.pillActive : ""}`}
            onClick={() => setOwnerFilter(o)}
          >
            {o.split(" ")[0]}
            <span className={styles.pillCount}>{ownerCounts.get(o) ?? 0}</span>
          </button>
        ))}
        <button
          className={`${styles.pill} ${ownerFilter === "unowned" ? styles.pillActive : ""}`}
          onClick={() => setOwnerFilter("unowned")}
        >
          Unowned
          <span className={styles.pillCount}>{ownerCounts.get("unowned") ?? 0}</span>
        </button>
      </div>

      {alerts === null ? (
        <div className={styles.loading}>Loading alerts…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <h3 className={styles.emptyTitle}>All clear</h3>
          <p>No alerts match the current filters.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filtered.map((a) => {
            const kindClass =
              a.kind === "contact_cold"
                ? styles.contact
                : a.kind === "marketplace_stall"
                  ? styles.stall
                  : a.kind === "task_stale"
                    ? styles.task
                    : styles.contract;
            const owner = subjectOwner(a);
            return (
            <li
              key={a.id}
              className={`${styles.row} ${kindClass}`}
            >
              <div className={styles.rowMain}>
                <span
                  className={`${styles.rowKind} ${kindClass}`}
                >
                  {ALERT_KIND_LABELS[a.kind as AlertKind]}
                </span>
                <span className={styles.rowName}>{subjectLabel(a)}</span>
                <span className={styles.rowMeta}>
                  <span>{ageLabel(a)}</span>
                  <span>· {owner ?? "Unowned"}</span>
                  {a.member?.phase && <span>· {a.member.phase}</span>}
                  {a.member?.organization && <span>· {a.member.organization}</span>}
                  {a.task && (
                    <>
                      <span>· {a.task.priority}</span>
                      <span>· {a.task.status}</span>
                    </>
                  )}
                </span>
                {a.kind === "marketplace_stall" &&
                  a.reason_json.incomplete_step_keys && (
                    <span className={styles.rowSteps}>
                      Open steps: {a.reason_json.incomplete_step_keys.join(", ")}
                    </span>
                  )}
              </div>
              <div className={styles.rowActions}>
                <Link
                  href={alertHref(a)}
                  className={`${styles.actionBtn} ${styles.primary}`}
                >
                  Open
                </Link>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => void act(a.id, "snooze")}
                  title="Snooze 7 days"
                >
                  Snooze 7d
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.resolve}`}
                  onClick={() => void act(a.id, "resolve")}
                >
                  Resolve
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
