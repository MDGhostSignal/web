"use client";

import { useMemo, useState } from "react";

import {
  Badge,
  type Column,
  DataTable,
  EmptyState,
  SearchInput,
  typeVariant,
} from "@/components/admin";
import {
  MOCK_ENTITIES,
  TRAIT_KEYS,
  TRAIT_LABELS,
  type MarketplaceEntity,
} from "@/lib/marketplace-mocks";
import type { Match } from "@/lib/marketplace-store";

import styles from "./marketplace.module.css";

type Props = {
  matches: Match[];
};

type KindFilter = "all" | "brand" | "creator";
type MatchedFilter = "all" | "matched" | "unmatched";

export function PoolView({ matches }: Props) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [matchedFilter, setMatchedFilter] = useState<MatchedFilter>("all");

  // Map entity-id → number of confirmed pairings, so we can show a
  // "matched N" pill in the table without re-walking the matches list
  // per row.
  const pairingsById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      counts.set(m.brand_id, (counts.get(m.brand_id) ?? 0) + 1);
      counts.set(m.creator_id, (counts.get(m.creator_id) ?? 0) + 1);
    }
    return counts;
  }, [matches]);

  const filtered = useMemo<MarketplaceEntity[]>(() => {
    const q = search.trim().toLowerCase();
    return MOCK_ENTITIES.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (matchedFilter !== "all") {
        const isMatched = (pairingsById.get(e.id) ?? 0) > 0;
        if (matchedFilter === "matched" && !isMatched) return false;
        if (matchedFilter === "unmatched" && isMatched) return false;
      }
      if (q) {
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.rq_code.toLowerCase().includes(q) &&
          !e.rq_name.toLowerCase().includes(q) &&
          !e.tags.some((t) => t.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [search, kindFilter, matchedFilter, pairingsById]);

  const columns: Column<MarketplaceEntity>[] = [
    {
      key: "name",
      header: "Name",
      cell: (e) => (
        <div className={styles.poolNameCell}>
          <span className={styles.poolName}>{e.name}</span>
          <span className={styles.mockPill} aria-label="Mock data">MOCK</span>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      width: "100px",
      cell: (e) => (
        <Badge variant={typeVariant(e.kind)}>
          {e.kind === "creator" ? "Creator" : "Brand"}
        </Badge>
      ),
    },
    {
      key: "rq",
      header: "RQ",
      cell: (e) => (
        <div className={styles.rqCell}>
          <span className={styles.rqCode}>{e.rq_code}</span>
          <span className={styles.rqName}>{e.rq_name}</span>
        </div>
      ),
    },
    ...TRAIT_KEYS.map(
      (k): Column<MarketplaceEntity> => ({
        key: `trait-${k}`,
        header: TRAIT_LABELS[k],
        width: "120px",
        variant: "numeric",
        cell: (e) => (
          <div className={styles.traitBar}>
            <div
              className={styles.traitFill}
              style={{ width: `${e.traits[k]}%` }}
            />
            <span className={styles.traitValue}>{e.traits[k]}</span>
          </div>
        ),
      }),
    ),
    {
      key: "tags",
      header: "Tags",
      cell: (e) => (
        <div className={styles.tagRow}>
          {e.tags.slice(0, 3).map((t) => (
            <span key={t} className={styles.tagChip}>
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "matches",
      header: "Matched",
      width: "90px",
      variant: "numeric",
      cell: (e) => {
        const n = pairingsById.get(e.id) ?? 0;
        return n > 0 ? (
          <Badge variant="success">{n}</Badge>
        ) : (
          <span className={styles.poolMatchEmpty}>—</span>
        );
      },
    },
  ];

  return (
    <div className={styles.poolView}>
      <div className={styles.poolToolbar}>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, RQ, or tag…"
        />
        <div className={styles.filterChips}>
          <FilterChipGroup
            label="Kind"
            value={kindFilter}
            options={[
              { id: "all", label: "All" },
              { id: "brand", label: "Brands" },
              { id: "creator", label: "Creators" },
            ]}
            onChange={(v) => setKindFilter(v as KindFilter)}
          />
          <FilterChipGroup
            label="Match status"
            value={matchedFilter}
            options={[
              { id: "all", label: "Any" },
              { id: "matched", label: "Matched" },
              { id: "unmatched", label: "Unmatched" },
            ]}
            onChange={(v) => setMatchedFilter(v as MatchedFilter)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          message="No entities match those filters."
        />
      ) : (
        <DataTable rows={filtered} columns={columns} />
      )}
    </div>
  );
}

/* =====================================================================
 * FilterChipGroup — reusable little segmented control. Extracted here
 * since the same shape appears in MatchBoard's tier filter too.
 * ===================================================================== */

type FilterOption = { id: string; label: string };

function FilterChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (id: string) => void;
}) {
  return (
    <div className={styles.filterChipGroup}>
      <span className={styles.filterChipGroupLabel}>{label}</span>
      <div className={styles.filterChipRow} role="tablist" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={value === o.id}
            className={`${styles.filterChip} ${
              value === o.id ? styles.filterChipActive : ""
            }`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { FilterChipGroup };
