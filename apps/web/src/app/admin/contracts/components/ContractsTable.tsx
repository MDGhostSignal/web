"use client";

import Link from "next/link";

import { Badge, type BadgeVariant, DataTable, type Column } from "@/components/admin";
import {
  type ContractRow,
  type ContractStatus,
  CONTRACT_STATUS_LABELS,
  COUNTERPARTY_KIND_LABELS,
} from "@/lib/esignatures-types";

import styles from "../contracts.module.css";

export type ContractsTableRow = ContractRow & {
  linkedMemberName?: string | null;
  suggestedMemberName?: string | null;
};

type Props = {
  rows: ContractsTableRow[];
};

/**
 * Dense 6-column table for the contracts dashboard. Each row is a
 * client-side link to /admin/contracts/[id] — we render the link inside
 * the title cell to keep the table accessible (the whole row isn't a
 * single anchor, but the primary identifier is).
 *
 * Columns: Title · Counterparty · Status · Signed · Expires · Linked to
 */
export function ContractsTable({ rows }: Props) {
  const columns: Column<ContractsTableRow>[] = [
    {
      key: "title",
      header: "Contract",
      variant: "truncate",
      width: "32%",
      sort: (a, b) =>
        (a.title ?? a.id).localeCompare(b.title ?? b.id, undefined, {
          sensitivity: "base",
        }),
      cell: (row) => (
        <Link
          href={`/admin/contracts/${encodeURIComponent(row.id)}`}
          className={styles.cellTitle}
          prefetch={false}
        >
          <span className={styles.cellTitleName}>
            {row.title || `(untitled contract)`}
          </span>
          <span className={styles.cellTitleSub}>{row.id.slice(0, 18)}…</span>
        </Link>
      ),
    },
    {
      key: "counterparty",
      header: "Counterparty",
      variant: "nowrap",
      width: "12%",
      sort: (a, b) =>
        (a.counterparty_kind ?? "").localeCompare(b.counterparty_kind ?? ""),
      cell: (row) =>
        row.counterparty_kind ? (
          <Badge variant={kindVariant(row.counterparty_kind)}>
            {COUNTERPARTY_KIND_LABELS[row.counterparty_kind]}
          </Badge>
        ) : (
          <span className={styles.cellDateMuted}>—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      variant: "nowrap",
      width: "12%",
      sort: (a, b) => a.status.localeCompare(b.status),
      cell: (row) => (
        <Badge variant={statusVariant(row.status)}>
          {CONTRACT_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: "signed",
      header: "Signed",
      variant: "nowrap",
      width: "14%",
      sort: (a, b) => compareIsoNullsLast(a.signed_at, b.signed_at),
      cell: (row) => (
        <span
          className={
            row.signed_at
              ? styles.cellDate
              : `${styles.cellDate} ${styles.cellDateMuted}`
          }
        >
          {row.signed_at ? formatDate(row.signed_at) : "—"}
        </span>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      variant: "nowrap",
      width: "14%",
      sort: (a, b) => compareIsoNullsLast(a.expires_at, b.expires_at),
      cell: (row) => (
        <span
          className={
            row.expires_at
              ? styles.cellDate
              : `${styles.cellDate} ${styles.cellDateMuted}`
          }
        >
          {row.expires_at ? formatDate(row.expires_at) : "—"}
        </span>
      ),
    },
    {
      key: "linked",
      header: "Linked to",
      variant: "truncate",
      width: "16%",
      cell: (row) => {
        if (row.linkedMemberName) {
          return (
            <span className={styles.cellMemberName}>{row.linkedMemberName}</span>
          );
        }
        if (row.suggestedMemberName) {
          return (
            <span className={styles.cellMemberSuggested}>
              Suggest: {row.suggestedMemberName}
            </span>
          );
        }
        return <span className={styles.cellMemberUnlinked}>Unlinked</span>;
      },
    },
  ];

  return <DataTable rows={rows} columns={columns} />;
}

function statusVariant(s: ContractStatus): BadgeVariant {
  switch (s) {
    case "signed":
    case "completed":
      return "success";
    case "sent":
    case "viewed":
      return "warn";
    case "declined":
    case "expired":
      return "danger";
    case "draft":
    case "withdrawn":
      return "neutral";
    default:
      return "neutral";
  }
}

function kindVariant(k: string): BadgeVariant {
  if (k === "creator") return "creator";
  if (k === "brand") return "brand";
  return "neutral";
}

function compareIsoNullsLast(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  // Descending-ready when caller reverses; we sort newest-first by default
  // by returning b - a here.
  const ta = a ? new Date(a).getTime() : null;
  const tb = b ? new Date(b).getTime() : null;
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return tb - ta;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
