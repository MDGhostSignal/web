"use client";

import { useMemo, useState } from "react";

import {
  type ContractRow,
  CONTRACT_ACTIVE_STATUSES,
  CONTRACT_AWAITING_STATUSES,
} from "@/lib/esignatures-types";

import styles from "../contracts.module.css";

type Props = {
  rows: ContractRow[];
  /** Days into the future considered "expiring soon". */
  expiringWindowDays?: number;
};

/**
 * Three-card KPI row at the top of /admin/contracts:
 *   - Awaiting Signature (sent / viewed)
 *   - Expiring Soon       (active + expires_at within N days, default 30)
 *   - Active              (signed / completed, not archived)
 *
 * All counts derive from the in-memory `rows` array — the table and
 * KPI cards stay in lockstep without a second API call.
 */
export function ContractsKpiRow({ rows, expiringWindowDays = 30 }: Props) {
  // Lazy useState initialiser snapshots Date.now() exactly once (the
  // initialiser runs outside render). The "expiring soon" window is
  // anchored to mount; on a dashboard the user reloads anyway this is
  // good enough and avoids the impure-Date.now-in-render lint rule.
  const [nowSnapshot] = useState<number>(() => Date.now());

  const { awaiting, active, expiringSoon } = useMemo(() => {
    const windowMs = expiringWindowDays * 24 * 60 * 60 * 1000;
    let awaitingCount = 0;
    let activeCount = 0;
    let expiringCount = 0;
    for (const r of rows) {
      if (r.archived_at) continue;
      if ((CONTRACT_AWAITING_STATUSES as readonly string[]).includes(r.status)) {
        awaitingCount += 1;
      }
      if ((CONTRACT_ACTIVE_STATUSES as readonly string[]).includes(r.status)) {
        activeCount += 1;
        if (r.expires_at) {
          const exp = new Date(r.expires_at).getTime();
          if (
            !Number.isNaN(exp) &&
            exp >= nowSnapshot &&
            exp - nowSnapshot <= windowMs
          ) {
            expiringCount += 1;
          }
        }
      }
    }
    return {
      awaiting: awaitingCount,
      active: activeCount,
      expiringSoon: expiringCount,
    };
  }, [rows, expiringWindowDays, nowSnapshot]);

  return (
    <div className={styles.kpiRow}>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>Awaiting signature</div>
        <div className={styles.kpiValue}>{awaiting}</div>
        <div className={styles.kpiSub}>Sent or viewed, no signature yet.</div>
      </div>
      <div className={`${styles.kpiCard} ${styles.kpiCardAccent}`}>
        <div className={styles.kpiLabel}>Expiring soon</div>
        <div className={styles.kpiValue}>{expiringSoon}</div>
        <div className={styles.kpiSub}>Active contracts expiring in ≤ {expiringWindowDays} days.</div>
      </div>
      <div className={styles.kpiCard}>
        <div className={styles.kpiLabel}>Active</div>
        <div className={styles.kpiValue}>{active}</div>
        <div className={styles.kpiSub}>Signed agreements currently in force.</div>
      </div>
    </div>
  );
}
