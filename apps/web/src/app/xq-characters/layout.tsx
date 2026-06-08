import type { Metadata } from "next";
import Link from "next/link";

import styles from "./xq-characters.module.css";

export const metadata: Metadata = {
  title: "XQ Characters — Conviction Quotient Archetypes",
  description:
    "The eight archetypes of the GhostSignal Conviction Quotient. A visual gallery of the personas the XQ assessment reveals.",
};

/**
 * Layout for the XQ Characters gallery — declares the dark page
 * shell + a back-home pill anchored to the top-left. Mirrors the
 * /xq-quiz layout pattern so the two surfaces feel connected.
 */
export default function XQCharactersLayout({
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
