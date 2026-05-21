import { useMemo } from "react";

import type {
  MercuryAccountRow,
  MercuryTransactionRow,
} from "@/lib/mercury-types";
import {
  formatCents,
  parseAmountCents,
  sumAmountsCents,
} from "@/lib/mercury-types";

import styles from "../finance.module.css";

import { KpiCard } from "./KpiCard";

type Props = {
  accounts: MercuryAccountRow[];
  /** Last 30 days of transactions, used for net-flow + runway. */
  transactions: MercuryTransactionRow[];
};

const BIGINT_ZERO = BigInt(0);
const LOOKBACK_DAYS = 30;

/**
 * Three-card hero row: Total cash · 30-day net flow · Runway (days at
 * current outflow). All math is in bigint cents — never JS Number.
 */
export function KpiRow({ accounts, transactions }: Props) {
  const { totalCents, currency, netFlowCents, runwayDays } = useMemo(() => {
    if (accounts.length === 0) {
      return {
        totalCents: BIGINT_ZERO,
        currency: "USD",
        netFlowCents: BIGINT_ZERO,
        runwayDays: null as number | null,
      };
    }

    const currency = accounts[0]?.currency ?? "USD";
    const totalCents = sumAmountsCents(
      accounts.map((a) => a.available_balance),
    );

    // Net flow over the lookback window: sum of signed amounts.
    let net = BIGINT_ZERO;
    let outflow = BIGINT_ZERO;
    for (const t of transactions) {
      const cents = parseAmountCents(t.amount);
      net += cents;
      if (cents < BIGINT_ZERO) outflow += -cents;
    }

    // Runway: total cash / average daily outflow. We avoid Number()
    // by computing days as a plain integer division on cents.
    let runwayDays: number | null = null;
    if (outflow > BIGINT_ZERO) {
      // avg daily outflow (cents) = outflow / LOOKBACK_DAYS
      // days of cash      = totalCents / avgDailyOutflow
      //                   = totalCents * LOOKBACK_DAYS / outflow
      const numerator = totalCents * BigInt(LOOKBACK_DAYS);
      const days = numerator / outflow;
      // Anything past ~10 years is "many years" — clamp.
      const clamped = days > BigInt(3650) ? 3650 : Number(days);
      runwayDays = clamped;
    }

    return { totalCents, currency, netFlowCents: net, runwayDays };
  }, [accounts, transactions]);

  const isPositiveNet = netFlowCents > BIGINT_ZERO;
  const netLabel = isPositiveNet ? "+" : "";

  return (
    <div className={styles.kpiRow}>
      <KpiCard
        label="Total cash"
        value={formatCents(totalCents, currency)}
        sub={
          <span>
            across {accounts.length} account
            {accounts.length === 1 ? "" : "s"}
          </span>
        }
      />
      <KpiCard
        label={`Net flow · last ${LOOKBACK_DAYS} days`}
        value={
          <span
            className={
              isPositiveNet ? styles.kpiTrendPositive : styles.kpiTrendNeutral
            }
          >
            {netLabel}
            {formatCents(netFlowCents, currency)}
          </span>
        }
        sub={
          isPositiveNet ? (
            <span>more in than out</span>
          ) : (
            <span>net outflow</span>
          )
        }
      />
      <KpiCard
        label="Runway at current burn"
        value={
          runwayDays == null ? "—" : runwayDays >= 3650 ? "10y+" : `${runwayDays}d`
        }
        sub={
          runwayDays == null ? (
            <span>no outflows in window</span>
          ) : (
            <span>days at last-{LOOKBACK_DAYS}-day avg burn</span>
          )
        }
        dim={runwayDays == null}
      />
    </div>
  );
}
