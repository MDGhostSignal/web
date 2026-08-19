"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorCard,
  Loading,
  PageHeader,
  type BadgeVariant,
  type Column,
} from "@/components/admin";
import { formatInZone, localTimeZone } from "@/lib/timezone";

import { OutreachComposer } from "./components/OutreachComposer";
import { RescheduleModal } from "./components/RescheduleModal";
import styles from "./outreach.module.css";

/** One reachout row as returned by GET /api/admin/outreach. */
export type OutreachRow = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  scheduled_at: string | null;
  recipient_tz: string | null;
  resend_id: string | null;
  created_at: string | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; rows: OutreachRow[]; tableMissing: boolean };

type Filter = "scheduled" | "sent" | "all";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  sent: "success",
  scheduled: "info",
  canceled: "neutral",
  failed: "danger",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "in 3h 20m" / "in 2 days" / "any moment" — coarse, human countdown
 *  to a scheduled send. Past-due shows "sending…". */
function countdown(iso: string | null, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const ms = t - now;
  if (ms <= 0) return "sending…";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "any moment";
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * /admin/outreach — Mike's cold-email brand prospecting surface.
 * Compose a personalized cold email, send it now or *schedule* it to
 * land at the perfect moment in the recipient's US inbox, and track
 * every reachout below. Scheduled sends can be rescheduled or canceled
 * right up until they go out. Email template: lib/cold-outreach-email.ts.
 */
export default function OutreachPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [composerOpen, setComposerOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [rescheduling, setRescheduling] = useState<OutreachRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [reconciling, setReconciling] = useState(false);
  // Ticks every 30s so countdowns stay live without a refetch.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/outreach", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setState({ kind: "error", message: body.error ?? `HTTP ${res.status}` });
          return;
        }
        setState({
          kind: "ready",
          rows: body.outreach ?? [],
          tableMissing: body.tableMissing === true,
        });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const rows = useMemo(
    () => (state.kind === "ready" ? state.rows : []),
    [state],
  );

  // Self-heal: if a scheduled send's time has already passed but the row
  // still reads "scheduled" (Resend delivered it, our row hasn't been
  // reconciled yet), true it up once on load rather than leaving it
  // looking stuck as "sending…". The cron does this on prod; this covers
  // the moment the tab is open (and local dev, where no cron runs).
  const autoReconciled = useRef(false);
  useEffect(() => {
    if (autoReconciled.current) return;
    const pastDue = rows.some(
      (r) =>
        r.status === "scheduled" &&
        r.scheduled_at &&
        new Date(r.scheduled_at).getTime() <= Date.now(),
    );
    if (!pastDue) return;
    autoReconciled.current = true;
    (async () => {
      try {
        await fetch("/api/admin/outreach/reconcile", { method: "POST" });
        setRefresh((n) => n + 1);
      } catch {
        /* the cron / manual "Refresh statuses" will catch it */
      }
    })();
  }, [rows]);

  // Epoch-ms of every still-scheduled send — fed to the composer +
  // reschedule modal so new picks auto-space around them.
  const scheduledPeers = useMemo(
    () =>
      rows
        .filter((r) => r.status === "scheduled" && r.scheduled_at)
        .map((r) => new Date(r.scheduled_at as string).getTime())
        .filter((n) => !Number.isNaN(n)),
    [rows],
  );

  const counts = useMemo(
    () => ({
      scheduled: rows.filter((r) => r.status === "scheduled").length,
      sent: rows.filter((r) => r.status === "sent").length,
      all: rows.length,
    }),
    [rows],
  );

  const visibleRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "scheduled")
      return rows.filter((r) => r.status === "scheduled");
    return rows.filter((r) => r.status === "sent");
  }, [rows, filter]);

  const cancelSend = useCallback(
    async (row: OutreachRow) => {
      if (
        !window.confirm(
          `Cancel the scheduled send to ${row.email}? It won't go out, and you'd need a fresh reachout to contact them again.`,
        )
      ) {
        return;
      }
      setBusyId(row.id);
      try {
        const res = await fetch(`/api/admin/outreach/${row.id}`, {
          method: "DELETE",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Cancel failed (${res.status}).`);
        setRefresh((n) => n + 1);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const refreshStatuses = useCallback(async () => {
    setReconciling(true);
    try {
      await fetch("/api/admin/outreach/reconcile", { method: "POST" });
      setRefresh((n) => n + 1);
    } catch {
      /* best-effort — the cron covers it anyway */
    } finally {
      setReconciling(false);
    }
  }, []);

  const columns: Column<OutreachRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (r) => <span className={styles.rowName}>{r.name || "—"}</span>,
      sort: (a, b) => a.name.localeCompare(b.name),
    },
    {
      key: "email",
      header: "Email",
      variant: "mono",
      cell: (r) => r.email,
      sort: (a, b) => a.email.localeCompare(b.email),
    },
    {
      key: "message",
      header: "Personal message",
      variant: "truncate",
      cell: (r) => r.message ?? "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{r.status}</Badge>
      ),
    },
    {
      key: "when",
      header: "When",
      variant: "nowrap",
      cell: (r) => {
        if (r.status === "scheduled" && r.scheduled_at) {
          const tz = r.recipient_tz ?? localTimeZone();
          return (
            <div className={styles.whenCell}>
              <span className={styles.whenPrimary}>
                {formatInZone(new Date(r.scheduled_at), tz)}
              </span>
              <span className={styles.whenCountdown}>
                {countdown(r.scheduled_at, now)}
              </span>
            </div>
          );
        }
        return formatDate(r.sent_at ?? r.created_at);
      },
      sort: (a, b) =>
        (a.scheduled_at ?? a.sent_at ?? a.created_at ?? "").localeCompare(
          b.scheduled_at ?? b.sent_at ?? b.created_at ?? "",
        ),
    },
    {
      key: "actions",
      header: "",
      variant: "nowrap",
      cell: (r) =>
        r.status === "scheduled" ? (
          <div className={styles.rowActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRescheduling(r)}
              disabled={busyId === r.id}
            >
              Reschedule
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void cancelSend(r)}
              disabled={busyId === r.id}
            >
              {busyId === r.id ? "…" : "Cancel"}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Cold Outreach"
        subtitle="Brand prospecting — send a personalized cold email now, or schedule it to land at the perfect US inbox moment. Onboarding brands is the current company focus."
        actions={
          <Button variant="primary" onClick={() => setComposerOpen(true)}>
            + New reachout
          </Button>
        }
      />

      {state.kind === "loading" && <Loading message="Loading reachouts…" />}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load the outreach list">
          {state.message}
        </ErrorCard>
      )}

      {state.kind === "ready" && state.tableMissing && (
        <EmptyState
          title="One-time setup needed"
          message={
            <>
              The <code>cold_outreach</code> table doesn&apos;t exist yet — run{" "}
              <code>docs/OUTREACH_SUPABASE_SCHEMA.sql</code> and{" "}
              <code>docs/OUTREACH_SCHEDULING_SCHEMA.sql</code> in the Supabase SQL
              editor, then reload this page.
            </>
          }
        />
      )}

      {state.kind === "ready" && !state.tableMissing && rows.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.filterRow} role="tablist" aria-label="Filter reachouts">
            {(["scheduled", "sent", "all"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`${styles.filterChip} ${filter === f ? styles.filterActive : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "scheduled" ? "Scheduled" : f === "sent" ? "Sent" : "All"}
                <span className={styles.filterCount}>{counts[f]}</span>
              </button>
            ))}
          </div>
          {counts.scheduled > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void refreshStatuses()}
              disabled={reconciling}
            >
              {reconciling ? "Refreshing…" : "Refresh statuses"}
            </Button>
          )}
        </div>
      )}

      {state.kind === "ready" &&
        !state.tableMissing &&
        (rows.length === 0 ? (
          <EmptyState
            title="No reachouts yet"
            message="Start the brand push — compose the first cold email."
            action={
              <Button variant="primary" onClick={() => setComposerOpen(true)}>
                + New reachout
              </Button>
            }
          />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title={`No ${filter} reachouts`}
            message={
              filter === "scheduled"
                ? "Nothing queued right now — schedule a reachout to line one up."
                : "Nothing here yet."
            }
          />
        ) : (
          <DataTable rows={visibleRows} columns={columns} />
        ))}

      {composerOpen && (
        <OutreachComposer
          onClose={() => setComposerOpen(false)}
          onSent={() => setRefresh((n) => n + 1)}
          scheduledPeers={scheduledPeers}
        />
      )}

      {rescheduling && (
        <RescheduleModal
          row={rescheduling}
          peers={scheduledPeers.filter(
            (ms) =>
              ms !==
              (rescheduling.scheduled_at
                ? new Date(rescheduling.scheduled_at).getTime()
                : NaN),
          )}
          onClose={() => setRescheduling(null)}
          onDone={() => setRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}
