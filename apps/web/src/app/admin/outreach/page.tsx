"use client";

import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorCard,
  Loading,
  PageHeader,
  type Column,
} from "@/components/admin";

import { OutreachComposer } from "./components/OutreachComposer";
import styles from "./outreach.module.css";

/** One reachout row as returned by GET /api/admin/outreach. */
export type OutreachRow = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  created_at: string | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; rows: OutreachRow[]; tableMissing: boolean };

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

/**
 * /admin/outreach — Mike's cold-email brand prospecting surface.
 * Compose a personalized cold email (name, email, personal message),
 * preview it exactly as it sends, and track every reachout in the
 * list below. Email template: lib/cold-outreach-email.ts (pitch copy
 * is a placeholder until the team finalizes it).
 */
export default function OutreachPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [composerOpen, setComposerOpen] = useState(false);
  // Bumped after a send so the effect refetches the list.
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/outreach", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setState({
            kind: "error",
            message: body.error ?? `HTTP ${res.status}`,
          });
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

  const columns: Column<OutreachRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (r) => <span className={styles.rowName}>{r.name}</span>,
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
        <Badge variant={r.status === "failed" ? "danger" : "success"}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "sent",
      header: "Sent",
      variant: "nowrap",
      cell: (r) => formatDate(r.sent_at ?? r.created_at),
      sort: (a, b) =>
        (a.sent_at ?? a.created_at ?? "").localeCompare(
          b.sent_at ?? b.created_at ?? "",
        ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Cold Outreach"
        subtitle="Brand prospecting — send a personalized cold email and track every reachout. Onboarding brands is the current company focus."
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
              <code>docs/OUTREACH_SUPABASE_SCHEMA.sql</code> in the Supabase SQL
              editor, then reload this page.
            </>
          }
        />
      )}

      {state.kind === "ready" &&
        !state.tableMissing &&
        (state.rows.length === 0 ? (
          <EmptyState
            title="No reachouts yet"
            message="Start the brand push — compose the first cold email."
            action={
              <Button variant="primary" onClick={() => setComposerOpen(true)}>
                + New reachout
              </Button>
            }
          />
        ) : (
          <DataTable rows={state.rows} columns={columns} />
        ))}

      {composerOpen && (
        <OutreachComposer
          onClose={() => setComposerOpen(false)}
          onSent={() => setRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}
