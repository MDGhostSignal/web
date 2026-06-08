import type { Metadata } from "next";
import Link from "next/link";

import styles from "./xq-characters2.module.css";

export const metadata: Metadata = {
  title: "XQ Characters (3D) — Conviction Quotient Archetypes",
  description:
    "The eight archetypes of the GhostSignal Conviction Quotient — rendered as dimensional 3D-style SVG illustrations.",
};

/**
 * Layout for the XQ Characters (3D) gallery — parallel to
 * /xq-characters but renders each archetype as a layered,
 * gradient-shaded SVG illustration rather than monoline line-art.
 */
export default function XQCharacters2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backHome} aria-label="Back to homepage">
        <span aria-hidden="true">←</span>
        Home
      </Link>
      {children}
    </div>
  );
}
