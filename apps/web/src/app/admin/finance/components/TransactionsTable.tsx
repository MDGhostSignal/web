"use client";

import { useMemo } from "react";

import { Badge, type BadgeVariant, type Column, DataTable } from "@/components/admin";
import type { MercuryTransactionRow } from "@/lib/mercury-types";
import {
  formatCents,
  parseAmountCents,
} from "@/lib/mercury-types";

import styles from "../finance.module.css";

type Props = {
  transactions: MercuryTransactionRow[];
  currency: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const BIGINT_ZERO = BigInt(0);

/**
 * Recent-transactions list. Wraps the shared DataTable.
 * Columns: Date · Counterparty + bank description · Kind badge · Amount · Status.
 *
 * Color discipline:
 *  - Inflows tinted with --admin-success (subtle green tint).
 *  - Outflows in --admin-text-secondary (neutral).
 *  - Pending status uses warn variant; sent/posted is the default neutral.
 *
 * This is the canonical "no red/green binary" pattern from the UX research:
 * red is reserved for failed/destructive, not for routine outflows.
 */
export function TransactionsTable({
  transactions,
  currency,
  selectedId,
  onSelect,
}: Props) {
  const columns: Column<MercuryTransactionRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (row) => (
          <span className={styles.txDate}>{formatTxDate(row)}</span>
        ),
        width: "120px",
      },
      {
        key: "counterparty",
        header: "Counterparty",
        cell: (row) => (
          <div className={styles.txCounterparty}>
            <span className={styles.txCounterpartyName}>
              {row.counterparty_name ||
                row.counterparty_nickname ||
                row.bank_description ||
                "—"}
            </span>
            {row.bank_description &&
              row.counterparty_name &&
              row.bank_description !== row.counterparty_name && (
                <span className={styles.txCounterpartyDesc}>
                  {row.bank_description}
                </span>
              )}
          </div>
        ),
        variant: "truncate",
      },
      {
        key: "kind",
        header: "Kind",
        cell: (row) =>
          row.kind ? <Badge variant="neutral">{formatKind(row.kind)}</Badge> : "—",
        width: "130px",
      },
      {
        key: "amount",
        header: "Amount",
        cell: (row) => {
          const cents = parseAmountCents(row.amount);
          const inflow = cents > BIGINT_ZERO;
          const sign = inflow ? "+" : "";
          return (
            <span
              className={[
                styles.txAmount,
                inflow ? styles.txAmountInflow : styles.txAmountOutflow,
              ].join(" ")}
            >
              {sign}
              {formatCents(cents, currency)}
            </span>
          );
        },
        variant: "numeric",
        width: "150px",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={statusVariant(row.status)}>
            {formatStatus(row.status)}
          </Badge>
        ),
        width: "110px",
      },
    ],
    [currency],
  );

  return (
    <DataTable
      rows={transactions}
      columns={columns}
      caption="Recent Mercury transactions"
      expandedRowId={selectedId}
      onToggleRow={onSelect}
      renderExpanded={() => null}
    />
  );
}

/* --- Cell helpers ---------------------------------------------------- */

function formatTxDate(row: MercuryTransactionRow): string {
  const iso = row.posted_at ?? row.created_at;
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "2-digit",
  });
}

function formatKind(kind: string): string {
  // Mercury kinds are camelCase: "externalTransfer" → "External transfer".
  const spaced = kind.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function statusVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (s === "posted" || s === "sent") return "success";
  if (s === "pending") return "warn";
  if (s === "failed") return "danger";
  if (s === "cancelled" || s === "canceled") return "neutral";
  return "neutral";
}
