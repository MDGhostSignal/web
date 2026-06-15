import Link from "next/link";

import styles from "./studio.module.css";
import { SignOutButton } from "./SignOutButton";

/** Shared header for the Studio surface. Brand mark on the left, a
 *  small tab nav in the middle, sign-out on the right. Sticky to the
 *  top so the nav follows scroll. */
export function StudioHeader({
  activeTab,
}: {
  activeTab: "dashboard" | "marketplace";
}) {
  return (
    <header className={styles.dashHeader}>
      <div className={styles.dashHeaderBrand}>
        <span className={styles.brandName}>GhostSignal</span>
        <span className={styles.brandTag}>Studio</span>
      </div>
      <nav className={styles.headerNav}>
        <Link
          href="/studio"
          className={`${styles.headerNavTab} ${activeTab === "dashboard" ? styles.headerNavTabActive : ""}`}
        >
          Dashboard
        </Link>
        <Link
          href="/studio/marketplace"
          className={`${styles.headerNavTab} ${activeTab === "marketplace" ? styles.headerNavTabActive : ""}`}
        >
          Marketplace
        </Link>
      </nav>
      <SignOutButton />
    </header>
  );
}
