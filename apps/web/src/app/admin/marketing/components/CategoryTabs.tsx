"use client";

import type {
  MarketingAssetCategory,
  MarketingAssetRow,
} from "@/lib/marketing-assets-types";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/marketing-assets-types";

import styles from "../marketing.module.css";

type Filter = MarketingAssetCategory | "all";

type Props = {
  assets: MarketingAssetRow[];
  value: Filter;
  onChange: (next: Filter) => void;
};

/**
 * `All / Brand / Marketing / Docs` chip filter under the page header.
 * Local state — no route segments — so switching tabs doesn't re-fetch.
 */
export function CategoryTabs({ assets, value, onChange }: Props) {
  const counts = countByCategory(assets);

  return (
    <div className={styles.categoryTabs} role="tablist">
      <ChipButton
        label="All"
        count={assets.length}
        active={value === "all"}
        onClick={() => onChange("all")}
      />
      {CATEGORIES.map((c) => (
        <ChipButton
          key={c}
          label={CATEGORY_LABELS[c]}
          count={counts[c] ?? 0}
          active={value === c}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

function ChipButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={[styles.chip, active ? styles.chipActive : ""].join(" ")}
      onClick={onClick}
    >
      {label}
      <span className={styles.chipCount}>{count}</span>
    </button>
  );
}

function countByCategory(
  assets: MarketingAssetRow[],
): Partial<Record<MarketingAssetCategory, number>> {
  const out: Partial<Record<MarketingAssetCategory, number>> = {};
  for (const a of assets) {
    out[a.category] = (out[a.category] ?? 0) + 1;
  }
  return out;
}
