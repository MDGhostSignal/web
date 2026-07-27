import Link from "next/link";

import { ThemeToggle } from "@/components/admin/ThemeToggle";

import styles from "./studio.module.css";
import { SignOutButton } from "./SignOutButton";

/** Shared header for the Studio surface. Brand mark on the left, a
 *  small tab nav in the middle, sign-out on the right. Sticky to the
 *  top so the nav follows scroll. */
export function StudioHeader({
  activeTab,
}: {
  activeTab: "dashboard" | "marketplace" | "world" | "profile";
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
        <Link
          href="/studio/world"
          className={`${styles.headerNavTab} ${activeTab === "world" ? styles.headerNavTabActive : ""}`}
        >
          World
        </Link>
        <Link
          href="/studio/profile"
          className={`${styles.headerNavTab} ${activeTab === "profile" ? styles.headerNavTabActive : ""}`}
        >
          Profile
        </Link>
      </nav>
      <div className={styles.headerTrail}>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
