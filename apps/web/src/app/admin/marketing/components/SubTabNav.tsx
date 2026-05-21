"use client";

import styles from "../marketing.module.css";

export type MarketingSection = "assets" | "copy" | "social";

const SECTION_LABELS: Record<MarketingSection, string> = {
  assets: "Assets",
  copy: "Copy",
  social: "Social",
};

const SECTIONS: ReadonlyArray<MarketingSection> = ["assets", "copy", "social"];

type Props = {
  value: MarketingSection;
  onChange: (next: MarketingSection) => void;
};

/**
 * Three-chip sub-tab navigation rendered inside the Marketing
 * PageHeader's `toolbar` slot. Local state, no route segments — same
 * pattern as `CategoryTabs`.
 */
export function SubTabNav({ value, onChange }: Props) {
  return (
    <div className={styles.subTabNav} role="tablist">
      {SECTIONS.map((s) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={s === value}
          className={[
            styles.subTabChip,
            s === value ? styles.subTabChipActive : "",
          ].join(" ")}
          onClick={() => onChange(s)}
        >
          {SECTION_LABELS[s]}
        </button>
      ))}
    </div>
  );
}
