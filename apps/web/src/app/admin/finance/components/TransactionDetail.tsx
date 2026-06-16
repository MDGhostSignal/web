import { Badge } from "@/components/admin";
import type {
  MercuryAccountRow,
  MercuryTransactionRow,
} from "@/lib/mercury-types";
import {
  formatCents,
  parseAmountCents,
} from "@/lib/mercury-types";

import styles from "../finance.module.css";

type Props = {
  transaction: MercuryTransactionRow;
  account: MercuryAccountRow | null;
};

const BIGINT_ZERO = BigInt(0);

/**
 * Modal body: full transaction detail. Inflows show "+" prefix on the
 * hero amount; outflows show "-". The "raw" jsonb from Mercury is
 * intentionally NOT displayed — it can contain account numbers and
 * routing info that the team doesn't need on screen day-to-day.
 */
export function TransactionDetail({ transaction, account }: Props) {
  const cents = parseAmountCents(transaction.amount);
  const inflow = cents > BIGINT_ZERO;
  const sign = inflow ? "+" : "-";
  const absCents = inflow ? cents : -cents;
  const currency = account?.currency ?? "USD";

  return (
    <div className={styles.txDetail}>
      <div className={styles.txDetailHero}>
        <div className={styles.txDetailAmount}>
          {sign}
          {formatCents(absCents, currency)}
        </div>
        <div className={styles.txDetailCounterparty}>
          {transaction.counterparty_name ||
            transaction.counterparty_nickname ||
            transaction.bank_description ||
            "Unknown counterparty"}
        </div>
      </div>

      <div className={styles.txDetailGrid}>
        <span className={styles.txDetailKey}>Status</span>
        <span className={styles.txDetailValue}>
          <Badge variant={statusBadge(transaction.status)}>
            {formatStatus(transaction.status)}
          </Badge>
        </span>

        <span className={styles.txDetailKey}>Kind</span>
        <span className={styles.txDetailValue}>
          {transaction.kind ? formatKind(transaction.kind) : "—"}
        </span>

        <span className={styles.txDetailKey}>Created</span>
        <span className={styles.txDetailValue}>
          {formatFullDate(transaction.created_at)}
        </span>

        <span className={styles.txDetailKey}>Posted</span>
        <span className={styles.txDetailValue}>
          {transaction.posted_at ? formatFullDate(transaction.posted_at) : "—"}
        </span>

        <span className={styles.txDetailKey}>Account</span>
        <span className={styles.txDetailValue}>
          {account
            ? `${account.name}${
                account.account_number_masked
                  ? ` · ${account.account_number_masked}`
                  : ""
              }`
            : transaction.account_id}
        </span>

        {transaction.bank_description && (
          <>
            <span className={styles.txDetailKey}>Description</span>
            <span className={styles.txDetailValue}>
              {transaction.bank_description}
            </span>
          </>
        )}

        {transaction.note && (
          <>
            <span className={styles.txDetailKey}>Note</span>
            <span className={styles.txDetailValue}>{transaction.note}</span>
          </>
        )}

        <span className={styles.txDetailKey}>Transaction ID</span>
        <span className={styles.txDetailValue}>{transaction.id}</span>
      </div>
    </div>
  );
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatKind(kind: string): string {
  const spaced = kind.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "posted" || s === "sent") return "success" as const;
  if (s === "pending") return "warn" as const;
  if (s === "failed") return "danger" as const;
  return "neutral" as const;
}
