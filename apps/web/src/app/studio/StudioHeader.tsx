import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { STUDIO_LITE_ONLY, STUDIO_ROSTER_HIDDEN } from "@/lib/studio-lite";

import styles from "./studio.module.css";
import { SignOutButton } from "./SignOutButton";

/** Shared header for the Studio surface. Brand mark on the left, a
 *  small tab nav in the middle, sign-out on the right. Sticky to the
 *  top so the nav follows scroll. */
export function StudioHeader({
  activeTab,
  profile,
}: {
  activeTab:
    | "dashboard"
    | "marketplace"
    | "roster"
    | "world"
    | "profile"
    | "results"
    | "migration"
    /** Onboarding splash — no nav tab highlights. */
    | "welcome";
  /** Circular profile shortcut in the header trail — the only route
   *  to /studio/profile in lite mode (no Profile tab). Shows the
   *  uploaded logo when there is one, else the member's initial;
   *  `attention` shows a dot when onboarding is incomplete. */
  profile?: { initial: string; imageUrl: string | null; attention: boolean };
}) {
  return (
    <header className={styles.dashHeader}>
      <div className={styles.dashHeaderBrand}>
        <span className={styles.brandName}>GHOSTSignal</span>
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
        {/* My character — the member's XQ/RQ reveal. Always available so
            they can revisit what they saw right after the quiz. */}
        <Link
          href="/studio/results"
          className={`${styles.headerNavTab} ${activeTab === "results" ? styles.headerNavTabActive : ""}`}
        >
          My Character
        </Link>
        {/* Roster is paused, not removed — its page also redirects
            while STUDIO_ROSTER_HIDDEN is on. */}
        {!STUDIO_ROSTER_HIDDEN && (
          <Link
            href="/studio/roster"
            className={`${styles.headerNavTab} ${activeTab === "roster" ? styles.headerNavTabActive : ""}`}
          >
            Roster
          </Link>
        )}
        <Link
          href="/studio/migration"
          className={`${styles.headerNavTab} ${activeTab === "migration" ? styles.headerNavTabActive : ""}`}
        >
          ART19 Tutorial
        </Link>
        {/* No Profile tab — the avatar circle in the trail is the way
            to /studio/profile. */}
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
            {profile.imageUrl ? (
              <Image
                src={profile.imageUrl}
                alt=""
                width={32}
                height={32}
                className={styles.headerAvatarImg}
                unoptimized
              />
            ) : (
              profile.initial
            )}
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
