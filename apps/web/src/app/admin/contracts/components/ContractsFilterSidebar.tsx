"use client";

import {
  type ContractCounterpartyKind,
  type ContractRow,
  type ContractStatus,
  CONTRACT_STATUS_LABELS,
  COUNTERPARTY_KIND_LABELS,
} from "@/lib/esignatures-types";

import styles from "../contracts.module.css";

export type FilterState = {
  status: ContractStatus | null;
  counterparty: ContractCounterpartyKind | null;
  unlinked: boolean;
  archived: boolean;
};

type Props = {
  rows: ContractRow[];
  value: FilterState;
  onChange: (next: FilterState) => void;
};

/**
 * Sticky filter rail on the left of the dashboard. Counts are derived
 * from the currently-loaded rows so the user can see how many contracts
 * sit in each bucket before clicking.
 *
 * "Needs linking" is a soft chip — a contract is unlinked when
 * member_id is null regardless of whether a suggestion exists.
 */
export function ContractsFilterSidebar({ rows, value, onChange }: Props) {
  const statusCounts = countBy(rows, (r) => (r.archived_at ? null : r.status));
  const counterpartyCounts = countBy(rows, (r) =>
    r.archived_at ? null : r.counterparty_kind,
  );
  const unlinkedCount = rows.filter(
    (r) => !r.archived_at && !r.member_id,
  ).length;
  const archivedCount = rows.filter((r) => Boolean(r.archived_at)).length;
  const totalActive = rows.filter((r) => !r.archived_at).length;

  const statuses: ContractStatus[] = [
    "sent",
    "viewed",
    "signed",
    "completed",
    "declined",
    "expired",
    "withdrawn",
    "draft",
  ];

  const counterparties: ContractCounterpartyKind[] = ["creator", "brand", "other"];

  return (
    <aside className={styles.filters} aria-label="Filter contracts">
      <div className={styles.filtersGroup}>
        <div className={styles.filtersGroupTitle}>Quick filters</div>
        <FilterChip
          label="All contracts"
          count={totalActive}
          active={
            value.status === null &&
            value.counterparty === null &&
            !value.unlinked &&
            !value.archived
          }
          onClick={() =>
            onChange({
              status: null,
              counterparty: null,
              unlinked: false,
              archived: false,
            })
          }
        />
        <FilterChip
          label="Needs linking"
          count={unlinkedCount}
          active={value.unlinked}
          onClick={() =>
            onChange({ ...value, unlinked: !value.unlinked, archived: false })
          }
        />
        <FilterChip
          label="Archived"
          count={archivedCount}
          active={value.archived}
          onClick={() =>
            onChange({
              ...value,
              archived: !value.archived,
              unlinked: false,
            })
          }
        />
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filtersGroup}>
        <div className={styles.filtersGroupTitle}>Status</div>
        {statuses.map((s) => {
          const count = statusCounts.get(s) ?? 0;
          return (
            <FilterChip
              key={s}
              label={CONTRACT_STATUS_LABELS[s]}
              count={count}
              active={value.status === s}
              onClick={() =>
                onChange({
                  ...value,
                  status: value.status === s ? null : s,
                })
              }
            />
          );
        })}
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filtersGroup}>
        <div className={styles.filtersGroupTitle}>Counterparty</div>
        {counterparties.map((k) => {
          const count = counterpartyCounts.get(k) ?? 0;
          return (
            <FilterChip
              key={k}
              label={COUNTERPARTY_KIND_LABELS[k]}
              count={count}
              active={value.counterparty === k}
              onClick={() =>
                onChange({
                  ...value,
                  counterparty: value.counterparty === k ? null : k,
                })
              }
            />
          );
        })}
      </div>
    </aside>
  );
}

type ChipProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function FilterChip({ label, count, active, onClick }: ChipProps) {
  const cls = active
    ? `${styles.filterChip} ${styles.filterChipActive}`
    : styles.filterChip;
  return (
    <button type="button" className={cls} onClick={onClick}>
      <span>{label}</span>
      <span className={styles.filterChipCount}>{count}</span>
    </button>
  );
}

function countBy<T, K>(rows: T[], key: (r: T) => K | null): Map<K, number> {
  const out = new Map<K, number>();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}
