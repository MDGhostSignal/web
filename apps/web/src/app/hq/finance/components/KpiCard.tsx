import type { ReactNode } from "react";

import styles from "../finance.module.css";

type Props = {
  label: string;
  value: ReactNode;
  /** Optional subtitle line, e.g. "across 3 accounts" or "vs. last month". */
  sub?: ReactNode;
  /** When true, value renders in the muted color (used for "—" empties). */
  dim?: boolean;
};

/**
 * Single KPI card for the Finance hero row. Compact, label-on-top,
 * mono numeric value, optional dim treatment for empty states.
 */
export function KpiCard({ label, value, sub, dim }: Props) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={[styles.kpiValue, dim ? styles.kpiValueDim : ""].join(" ")}>
        {value}
      </div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}
