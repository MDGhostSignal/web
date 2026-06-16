"use client";

import type { MarketingAssetRow } from "@/lib/marketing-assets-types";

import styles from "../marketing.module.css";

import { AssetCard, type CardPreview } from "./AssetCard";

type Props = {
  assets: MarketingAssetRow[];
  /** Map: asset id → primary-file preview (url + mime). */
  previews?: Map<string, CardPreview>;
  /** Map: asset id → variant count. */
  variantCounts?: Map<string, number>;
  onSelect: (id: string) => void;
};

/**
 * Responsive auto-fill grid of AssetCards. The grid layout is owned
 * by CSS (grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))) —
 * this component is mostly a typed adapter for the cards.
 */
export function AssetGrid({
  assets,
  previews,
  variantCounts,
  onSelect,
}: Props) {
  return (
    <div className={styles.grid}>
      {assets.map((a) => (
        <AssetCard
          key={a.id}
          asset={a}
          preview={previews?.get(a.id) ?? null}
          variantCount={variantCounts?.get(a.id)}
          onClick={() => onSelect(a.id)}
        />
      ))}
    </div>
  );
}
