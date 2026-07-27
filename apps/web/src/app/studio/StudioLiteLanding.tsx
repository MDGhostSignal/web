import Link from "next/link";

import styles from "./StudioLiteLanding.module.css";

/**
 * Public-facing /studio landing — Studio Lite edition.
 *
 * Replaces StudioLanding (kept in the repo as legacy) while
 * STUDIO_LITE_ONLY is on. Deliberately promises only what the lite
 * workspace ships today: a member-managed profile, the network
 * roster, and GhostSignal-brokered matching. No X-Deck, no World.
 *
 * Server component — plain Link navigation only; all motion is CSS.
 */
export function StudioLiteLanding() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>GhostSignal</span>
          <span className={styles.brandTag}>Studio</span>
        </div>
        <div className={styles.topbarActions}>
          <Link href="/what-is-this" className={styles.linkSubtle}>
            What is GhostSignal?
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
            Studio is the GhostSignal members&rsquo; workspace, pared to
            the essentials: keep your profile sharp, see every vetted
            brand and show you share the air with, and let our team
            broker the partnerships that fit.
          </p>
          <div className={`${styles.heroActions} ${styles.rise4}`}>
            <Link href="/studio/login" className={styles.btnPrimary}>
              Sign in
            </Link>
            <Link href="/get-in-touch" className={styles.btnGhost}>
              Apply for access
            </Link>
          </div>
        </div>
      </section>

      {/* What you get — the two real features ---------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Inside the workspace</p>
          <h2 className={styles.sectionTitle}>
            Two surfaces. No busywork.
          </h2>

          <div className={styles.panelGrid}>
            <article className={styles.panel}>
              <span className={styles.panelIndex} aria-hidden="true">
                01
              </span>
              <h3 className={styles.panelTitle}>Your profile</h3>
              <p className={styles.panelBody}>
                How you present to the other side of the network. Your
                description, your links, your contact &mdash; kept
                current by you, shown to the partners we put in front
                of you. Creators point at their show and newsletter;
                brands at what they stand for.
              </p>
            </article>
            <article className={`${styles.panel} ${styles.panelOffset}`}>
              <span className={styles.panelIndex} aria-hidden="true">
                02
              </span>
              <h3 className={styles.panelTitle}>The roster</h3>
              <p className={styles.panelBody}>
                The full directory of vetted brands and shows on the
                GhostSignal network &mdash; who they are, what they
                make, and the scale they operate at. Know exactly who
                you share the air with.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Handled for you ------------------------------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.handledBand}>
            <div className={styles.handledIntro}>
              <p className={styles.sectionEyebrow}>The rest is on us</p>
              <h2 className={styles.handledTitle}>
                Matching stays human.
              </h2>
              <p className={styles.handledLede}>
                We don&rsquo;t hand you a swipe deck and wish you luck.
                The GhostSignal team reads both sides of the network and
                brings you the partnerships worth having &mdash;
                you&rsquo;ll hear from us when one fits.
              </p>
            </div>
            <ul className={styles.handledList}>
              <li className={styles.handledItem}>
                <span className={styles.handledItemLabel}>Matching</span>
                <p className={styles.handledItemBody}>
                  Values-aligned pairings, curated by the team.
                </p>
              </li>
              <li className={styles.handledItem}>
                <span className={styles.handledItemLabel}>Contracts</span>
                <p className={styles.handledItemBody}>
                  Paperwork and renewals handled end to end.
                </p>
              </li>
              <li className={styles.handledItem}>
                <span className={styles.handledItemLabel}>Campaigns</span>
                <p className={styles.handledItemBody}>
                  Ad setup and reporting run on ART19 by us.
                </p>
              </li>
            </ul>
          </div>
          <p className={styles.roadmapNote}>
            The workspace grows from here &mdash; more member tools are
            on the way.
          </p>
        </div>
      </section>

      {/* Closing CTA ----------------------------------------------- */}
      <section className={styles.closingSection}>
        <div className={styles.morse} aria-hidden="true" />
        <h2 className={styles.closingTitle}>
          Already a member, or think you should be?
        </h2>
        <div className={styles.closingActions}>
          <Link href="/studio/login" className={styles.btnPrimary}>
            Sign in to Studio
          </Link>
          <Link href="/get-in-touch" className={styles.btnGhost}>
            Get in touch
          </Link>
        </div>
      </section>
    </main>
  );
}
