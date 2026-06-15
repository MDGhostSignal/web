"use client";

import type { CalendarView } from "@/lib/social-calendar";

import styles from "../../marketing.module.css";

type Props = {
  view: CalendarView;
  onChange: (next: CalendarView) => void;
};

const OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function ViewSwitcher({ view, onChange }: Props) {
  return (
    <div
      className={styles.viewSwitcher}
      role="tablist"
      aria-label="Calendar view"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === view;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              styles.viewSwitcherBtn,
              active ? styles.viewSwitcherBtnActive : "",
            ].join(" ")}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
