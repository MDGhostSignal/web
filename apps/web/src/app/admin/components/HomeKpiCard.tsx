"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import styles from "../admin-home.module.css";

type Props = {
  label: string;
  /** Big value rendered in mono. Use `formatCents`-style output. */
  value: ReactNode;
  /** Optional sub-line (e.g. "across 3 accounts", "due in 12 h"). */
  sub?: ReactNode;
  /** Optional footer body (e.g. a short list of due posts). */
  body?: ReactNode;
  /** Where the card's "Open" link goes. */
  href: string;
  /** Loading / error states render with the same chrome. */
  state?: "loading" | "error" | "ready";
  /** Inline error message for `state="error"`. */
  errorMessage?: string;
};

/**
 * Single KPI tile rendered in the Dashboard home grid. Big number on
 * top, optional body underneath, click-through to the relevant
 * section.
 *
 * The card carries its own loading + error states so a failed fetch
 * in one tile doesn't blank the whole dashboard.
 */
export function HomeKpiCard({
  label,
  value,
  sub,
  body,
  href,
  state = "ready",
  errorMessage,
}: Props) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>

      {state === "loading" && (
        <div className={styles.cardSkeleton} aria-hidden="true" />
      )}

      {state === "error" && (
        <>
          <div className={styles.cardValueError}>—</div>
          <div className={styles.cardError}>
            {errorMessage ?? "Couldn't load."}
          </div>
        </>
      )}

      {state === "ready" && (
        <>
          <div className={styles.cardValue}>{value}</div>
          {sub && <div className={styles.cardSub}>{sub}</div>}
          {body && <div className={styles.cardBody}>{body}</div>}
        </>
      )}

      <div className={styles.cardOpen}>Open →</div>
    </Link>
  );
}
