import type { Metadata } from "next";

import "./studio-tokens.css";
import styles from "./studio.module.css";

export const metadata: Metadata = {
  title: "GHOSTSignal Studio",
  description: "Your GHOSTSignal client workspace — performance, matching, and brand-creator collaboration.",
};

/**
 * Studio shell — bare wrapper for the client-facing /studio surface.
 * Distinct from /admin (where the four co-founders work). Brand and
 * creator accounts log in here to see their own data and browse the
 * marketplace.
 *
 * The header chrome is intentionally minimal at MVP — brand mark, sign
 * out, and the page content. As the feature set grows we'll add a
 * sidebar with the per-section navigation.
 */
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={`${styles.shell} studio-root`}>{children}</div>;
}
