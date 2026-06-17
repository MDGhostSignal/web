import Link from "next/link";

import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { XDeckSection } from "@/app/x-deck/XDeckSection";
import { XQ3DWordmark, RQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";
import { MOCK_VIEWER } from "@/lib/match/fixtures";
import { PREVIEW_CANDIDATES } from "@/lib/match/preview-fixtures";

import styles from "./StudioLanding.module.css";

/**
 * Public-facing /studio landing page.
 *
 * Served to visitors who hit /studio without an authenticated member
 * — replaces the previous instant redirect to /studio/login so the
 * surface has an actual front door. Members who are signed in keep
 * landing on the dashboard above this in /studio/page.tsx.
 *
 * Server component — no interactivity beyond plain Link navigation.
 */
export function StudioLanding() {
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
          <p className={styles.heroEyebrow}>Members workspace</p>
          <h1 className={styles.heroTitle}>
            Your private signal HQ for brand &amp; creator partnerships.
          </h1>
          <p className={styles.heroLede}>
            Studio is the GhostSignal members&rsquo; workspace &mdash;
            where your show or your campaign meets live performance
            data, your conviction profile, and the partners your values
            already align with.
          </p>
          <div className={styles.heroActions}>
            <Link href="/studio/login" className={styles.btnPrimary}>
              Sign in
            </Link>
            <Link href="/get-in-touch" className={styles.btnGhost}>
              Apply for access
            </Link>
          </div>
        </div>
      </section>

      {/* The framework — XQ + RQ. Sits immediately under the hero
          so the assessment vocabulary lands before the rest of the
          landing copy uses it. */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>The framework</p>
          <h2 className={styles.sectionTitle}>
            The XQ and RQ &mdash; your conviction made measurable.
          </h2>
          <p className={styles.sectionLede}>
            Every brand and every show puts out a signal. We built two
            connected assessments to map yours and turn it into
            partnerships you can be proud of.
          </p>

          <div className={styles.assessmentPair}>
            <div className={styles.assessmentColumn}>
              <div className={styles.assessmentWordmark}>
                <XQ3DWordmark />
              </div>
              <article className={styles.assessmentCard}>
                <p className={styles.assessmentLabel}>Values Blueprint</p>
                <p className={styles.assessmentAvailability}>
                  Free &middot; Open to everyone
                </p>
                <p className={styles.assessmentBody}>
                  A three-minute audit that uncovers the internal
                  compass of your business. Codify your non-negotiables
                  and your operating style across eight archetypes
                  &mdash; and walk away with a Values Blueprint that
                  gives brands and creators absolute clarity on who
                  they are.
                </p>
              </article>
            </div>
            <div className={styles.assessmentColumn}>
              <div className={styles.assessmentWordmark}>
                <RQ3DWordmark />
              </div>
              <article className={styles.assessmentCard}>
                <p className={styles.assessmentLabel}>Resonance Quotient</p>
                <p className={styles.assessmentAvailability}>
                  Members only &middot; The matching engine
                </p>
                <p className={styles.assessmentBody}>
                  Reserved for full <BrandedGhostSignal /> members, the
                  RQ translates your XQ blueprint into aligned
                  partnerships. It&rsquo;s the bridge that matches
                  brands with the right podcasts for revenue you can be
                  proud of &mdash; and creators with the right brands
                  for campaigns that don&rsquo;t cost them their
                  audience.
                </p>
              </article>
            </div>
          </div>

          <p className={styles.frameworkEmphatic}>
            Together, the XQ and RQ give brands and creators a renewed
            sense of purpose, rich clarity, and the data needed for
            frictionless, high-value partnerships.
          </p>
        </div>
      </section>

      {/* The X-Deck preview — deliberately dark band inside the
          otherwise light landing. The wrapping section carries
          `data-xd-force-dark`, which the x-deck module reads to
          re-assert dark token values even though the surrounding
          studio-root is in light mode. Sits directly under the
          XQ/RQ framework so the matched-output story lands
          alongside the assessments that produce it. */}
      <section
        className={`${styles.section} ${styles.xdeckDarkSection}`}
        data-xd-force-dark
      >
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>The X-Deck</p>
          <h2 className={styles.sectionTitle}>
            Your matched deck. Made for you.
          </h2>
          <p className={styles.sectionLede}>
            When the XQ knows you, the X-Deck shows you. Every potential
            partner becomes a trading card &mdash; archetype, conviction
            fingerprint, shared values, and a single resonance score
            that reads at a glance.
          </p>
          <p className={styles.sectionLede}>
            For brands, it&rsquo;s the end of cold outreach to creators
            who don&rsquo;t share your soul. For creators, it&rsquo;s a
            shortlist of advertisers who already get it. The deck below
            is a live preview &mdash; sample data, real interface.
          </p>
        </div>
        <div className={styles.xdeckSlot}>
          <XDeckSection
            viewer={MOCK_VIEWER}
            candidates={PREVIEW_CANDIDATES}
            eyebrow="Preview"
            title="A sample deck for a brand-side viewer"
            compact
            previewMode
          />
        </div>
      </section>

      {/* What is this --------------------------------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>What this is</p>
          <h2 className={styles.sectionTitle}>
            One workspace. Your performance, your profile, your matches.
          </h2>
          <p className={styles.sectionLede}>
            Studio brings the three things every brand and creator in
            the network needs into a single, focused surface &mdash; so
            you can stop stitching analytics, archetype data, and
            outreach together by hand.
          </p>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <span className={styles.featureBadge} aria-hidden="true">
                ▌
              </span>
              <h3 className={styles.featureTitle}>Live performance</h3>
              <p className={styles.featureBody}>
                Listen counts, episode reach, and campaign impressions
                streamed from ART19 &mdash; scoped to your show or your
                brand only.
              </p>
            </article>
            <article className={styles.featureCard}>
              <span className={styles.featureBadge} aria-hidden="true">
                ◆
              </span>
              <h3 className={styles.featureTitle}>Your XQ &amp; RQ profile</h3>
              <p className={styles.featureBody}>
                The Values Blueprint and Resonance Quotient that GhostSignal
                uses to match you &mdash; visible to you, side by side,
                with the archetype and the axis read.
              </p>
            </article>
            <article className={styles.featureCard}>
              <span className={styles.featureBadge} aria-hidden="true">
                ◇
              </span>
              <h3 className={styles.featureTitle}>Marketplace + World</h3>
              <p className={styles.featureBody}>
                Browse the matched X-Deck of brands or creators tuned to
                your signal, and walk into the GhostSignal World to meet
                them in a shared social space.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Who this is for ----------------------------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Who this is for</p>
          <h2 className={styles.sectionTitle}>
            Vetted brands and creators inside the GhostSignal network.
          </h2>
          <p className={styles.sectionLede}>
            Studio is the members&rsquo; surface of the GhostSignal
            podcast advertising network &mdash; the workspace you get
            once your XQ assessment is reviewed and your show or
            brand is invited into the network.
          </p>
          <div className={styles.personaGrid}>
            <article className={styles.personaCard}>
              <span className={styles.personaLabel}>For creators</span>
              <h3 className={styles.personaTitle}>
                Premium partnerships that don&rsquo;t cost you your
                audience.
              </h3>
              <p className={styles.personaIntro}>
                Your show on ART19 plus a curated stream of brands
                aligned to your archetype &mdash; with the paperwork,
                reporting, and payment tracking handled for you.
              </p>
              <ul className={styles.personaList}>
                <li className={styles.personaListItem}>
                  Live listen counts, episode reach, and growth from
                  your ART19 feed.
                </li>
                <li className={styles.personaListItem}>
                  Your XQ archetype and RQ axis read, shown the same way
                  brands see it on the matching engine.
                </li>
                <li className={styles.personaListItem}>
                  A matched-brand X-Deck &mdash; conviction-aligned
                  advertisers ranked by resonance fit, not just bid.
                </li>
                <li className={styles.personaListItem}>
                  Contracts, ad insertion, and payment tracking handled
                  by the GhostSignal team.
                </li>
              </ul>
            </article>
            <article className={styles.personaCard}>
              <span className={styles.personaLabel}>For brands</span>
              <h3 className={styles.personaTitle}>
                Campaigns that resonate, run by people who already
                share your values.
              </h3>
              <p className={styles.personaIntro}>
                Your campaign performance, audience reach, and a
                curated deck of creators whose archetype maps against
                yours &mdash; so every placement starts from shared
                conviction.
              </p>
              <ul className={styles.personaList}>
                <li className={styles.personaListItem}>
                  Live impressions and reach across your active campaigns
                  on ART19.
                </li>
                <li className={styles.personaListItem}>
                  Your XQ &amp; RQ profile alongside the creators you
                  match with.
                </li>
                <li className={styles.personaListItem}>
                  A matched-creator X-Deck &mdash; shows whose
                  non-negotiables overlap with yours.
                </li>
                <li className={styles.personaListItem}>
                  Reporting and per-podcast breakdowns, all in one place
                  &mdash; no spreadsheets, no chasing.
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* The World preview --------------------------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>The World</p>
          <h2 className={styles.sectionTitle}>
            Walk into the world. Meet your match in person.
          </h2>
          <p className={styles.sectionLede}>
            Studio members enter a shared, browser-based world &mdash;
            an overhead-view, real-time multiplayer space where every
            brand and creator is represented by a character tuned to
            their XQ archetype. Walk up to anyone, press a key, and a
            private chat opens with their full match read alongside.
          </p>
          <p className={styles.sectionLede}>
            It&rsquo;s the &ldquo;office floor&rdquo; of the network
            &mdash; built so partnerships can start from a real
            conversation instead of a cold inbox.
          </p>

          <div className={styles.worldPreview}>
            <div className={styles.worldFrame}>
              <img
                src="/world/sprites/SNES - Harvest Moon - Backgrounds - Village (Summer).png"
                alt="A bird&rsquo;s-eye view of the GhostSignal World village — pixel-art buildings, paths, and trees laid out in a town square."
                className={styles.worldImage}
                loading="lazy"
              />
              <div className={styles.worldFrameOverlay} aria-hidden="true">
                <span className={styles.worldFrameBadge}>Live preview</span>
              </div>
            </div>

            <ul className={styles.worldFeatureList}>
              <li className={styles.worldFeatureItem}>
                <span className={styles.worldFeatureLabel}>Pixel-art world</span>
                <p className={styles.worldFeatureBody}>
                  A persistent overhead village, rendered in classic
                  16-bit style so the surface stays welcoming rather
                  than overwhelming.
                </p>
              </li>
              <li className={styles.worldFeatureItem}>
                <span className={styles.worldFeatureLabel}>Real-time multiplayer</span>
                <p className={styles.worldFeatureBody}>
                  Every other member online is a character on the same
                  map &mdash; you see them move, gather, and idle near
                  the buildings that fit their archetype.
                </p>
              </li>
              <li className={styles.worldFeatureItem}>
                <span className={styles.worldFeatureLabel}>Walk-up to chat</span>
                <p className={styles.worldFeatureBody}>
                  Step up to any other player, press <kbd>E</kbd>, and
                  a private conversation opens with their XQ archetype,
                  values, and resonance fit shown next to it.
                </p>
              </li>
              <li className={styles.worldFeatureItem}>
                <span className={styles.worldFeatureLabel}>Members only</span>
                <p className={styles.worldFeatureBody}>
                  The world is reserved for vetted brand and creator
                  members &mdash; a small, considered room rather than
                  a public lobby.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Closing CTA --------------------------------------------- */}
      <section className={styles.closingSection}>
        <h2 className={styles.closingTitle}>
          Already a member, or curious if you should be?
        </h2>
        <p className={styles.closingLede}>
          Sign in to your workspace, or get in touch and we&rsquo;ll
          walk you through the network and whether your brand or show
          is a fit.
        </p>
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
