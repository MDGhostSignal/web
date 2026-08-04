import Link from "next/link";

import styles from "./StudioLiteLanding.module.css";

/**
 * Public-facing /studio landing — Studio Lite edition.
 *
 * Replaces StudioLanding (kept in the repo as legacy) while
 * STUDIO_LITE_ONLY is on. Pared to topbar + hero only (2026-08-04,
 * Martin's call: everything below the hero's Sign in button removed).
 * The former sections — "Two surfaces" panels, the client-portfolio
 * deck (ClientPortfolio.tsx, still in the repo), "Handled for you",
 * closing CTA — live in git history if the landing grows back.
 *
 * Server component — plain Link navigation only; all motion is CSS.
 */
export function StudioLiteLanding() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>GHOSTSignal</span>
          <span className={styles.brandTag}>Studio</span>
        </div>
        <div className={styles.topbarActions}>
          <Link href="/what-is-this" className={styles.linkSubtle}>
            What is GHOSTSignal?
          </Link>
          <Link href="/studio/login" className={styles.btnGhost}>
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero ------------------------------------------------------ */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={`${styles.heroEyebrow} ${styles.rise1}`}>
            Members workspace
          </p>
          <h1 className={`${styles.heroTitle} ${styles.rise2}`}>
            Your place on the{" "}
            <span className={styles.heroTitleAccent}>network</span>.
          </h1>
          <div className={`${styles.morse} ${styles.rise3}`} aria-hidden="true" />
          <p className={`${styles.heroLede} ${styles.rise3}`}>
            Studio is the GHOSTSignal members&rsquo; workspace.
          </p>
          <div className={`${styles.heroActions} ${styles.rise4}`}>
            <Link href="/studio/login" className={styles.btnPrimary}>
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
