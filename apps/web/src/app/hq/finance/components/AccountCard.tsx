import type { MercuryAccountRow } from "@/lib/mercury-types";
import {
  formatCents,
  parseAmountCents,
} from "@/lib/mercury-types";

import styles from "../finance.module.css";

import { AccountSparkline } from "./AccountSparkline";

type Props = {
  account: MercuryAccountRow;
  /** 7-day balance series for this account. Falls back to a text
   *  placeholder when absent (chart endpoint not loaded yet). */
  sparklineSeries?: ReadonlyArray<{ date: string; balance: string }>;
};

const BIGINT_ZERO = BigInt(0);

/**
 * Per-account balance card: name + masked number + current balance,
 * available balance secondary, and a 7-day balance sparkline.
 */
export function AccountCard({ account, sparklineSeries }: Props) {
  const currentCents = parseAmountCents(account.current_balance);
  const availableCents = parseAmountCents(account.available_balance);
  const showAvailableSeparately = availableCents !== currentCents;

  return (
    <article className={styles.accountCard}>
      <header className={styles.accountHeader}>
        <div>
          <div className={styles.accountName}>{account.name}</div>
          {account.account_number_masked && (
            <div className={styles.accountNumber}>
              {account.account_number_masked}
            </div>
          )}
        </div>
      </header>

      <div className={styles.accountBalance}>
        {formatCents(currentCents, account.currency)}
      </div>

      {showAvailableSeparately && (
        <div className={styles.accountAvailable}>
          available
          <span className={styles.accountAvailableValue}>
            {formatCents(availableCents, account.currency)}
          </span>
        </div>
      )}

      <div className={styles.accountSparklineSlot}>
        {sparklineSeries && sparklineSeries.length >= 2 ? (
          <AccountSparkline
            series={sparklineSeries}
            positive={isPositiveDelta(sparklineSeries)}
          />
        ) : (
          <span>7-day trend</span>
        )}
      </div>
    </article>
  );
}

function isPositiveDelta(
  series: ReadonlyArray<{ balance: string }>,
): boolean {
  if (series.length < 2) return false;
  const first = parseAmountCents(series[0].balance);
  const last = parseAmountCents(series[series.length - 1].balance);
  return last - first > BIGINT_ZERO;
}
