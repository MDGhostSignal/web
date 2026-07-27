import Link from "next/link";

import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { STUDIO_LITE_ONLY } from "@/lib/studio-lite";

import styles from "./studio.module.css";
import { SignOutButton } from "./SignOutButton";

/** Shared header for the Studio surface. Brand mark on the left, a
 *  small tab nav in the middle, sign-out on the right. Sticky to the
 *  top so the nav follows scroll. */
export function StudioHeader({
  activeTab,
  profile,
}: {
  activeTab: "dashboard" | "marketplace" | "roster" | "world" | "profile";
  /** Circular profile shortcut in the header trail. `attention` shows
   *  a dot when onboarding is incomplete (XQ/RQ/profile gaps). */
  profile?: { initial: string; attention: boolean };
}) {
  return (
    <header className={styles.dashHeader}>
      <div className={styles.dashHeaderBrand}>
        <span className={styles.brandName}>GhostSignal</span>
        <span className={styles.brandTag}>Studio</span>
      </div>
      <nav className={styles.headerNav}>
        {/* Legacy tabs (dashboard/marketplace/world) hide in lite mode;
            their pages also redirect, so no deep link resurrects them. */}
        {!STUDIO_LITE_ONLY && (
          <>
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
          </>
        )}
        <Link
          href="/studio/profile"
          className={`${styles.headerNavTab} ${activeTab === "profile" ? styles.headerNavTabActive : ""}`}
        >
          Profile
        </Link>
        <Link
          href="/studio/roster"
          className={`${styles.headerNavTab} ${activeTab === "roster" ? styles.headerNavTabActive : ""}`}
        >
          Roster
        </Link>
        {!STUDIO_LITE_ONLY && (
          <Link
            href="/studio/world"
            className={`${styles.headerNavTab} ${activeTab === "world" ? styles.headerNavTabActive : ""}`}
          >
            World
          </Link>
        )}
      </nav>
      <div className={styles.headerTrail}>
        {profile && (
          <Link
            href="/studio/profile"
            className={styles.headerAvatar}
            aria-label="Review and edit your profile"
          >
            {profile.initial}
            {profile.attention && (
              <span className={styles.headerAvatarDot} aria-hidden="true" />
            )}
          </Link>
        )}
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
