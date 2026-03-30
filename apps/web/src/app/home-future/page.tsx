import Image from "next/image";
import Link from "next/link";

import { GhostSignalLiquidWordmark } from "@/components/GhostSignalLiquidWordmark";
import { SiteHeader } from "@/components/SiteHeader";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { ScrollGrowDockPin } from "@/motion/ScrollGrowDockPin";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "./page.module.css";

const navLinks = [
  { href: "/what-is-this", label: "What is this" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/for-advertisers", label: "For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
  { href: "/snowdrift", label: "SNOWDRIFT" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

const exploreLinks = [
  { href: "/for-brands", label: "Explore For Brands" },
  { href: "/for-advertisers", label: "Explore For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
] as const;

const trustedRows = new Array(6).fill(null);

export default function FutureHomePage() {
  return (
    <main className={styles.home}>
      <SiteHeader links={navLinks} />

      <section className={styles.heroDark}>
        <div className={styles.heroSky} aria-hidden="true" />
        <h1 className={styles.srOnly}>GhostSignal</h1>
        <div className={styles.heroLiquidWordmark}>
          <GhostSignalLiquidWordmark />
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.frame}>
          <div className={styles.heroLines}>
            <div className={styles.hero2Left}>
              <ScrollFadeUp index={0} duration={2.2} start="top 74%">
                <p className={styles.hero2Asterisk}>*</p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={2.2} start="top 74%">
                <p className={styles.hero2Lead}>{`We are a values-based\nadvertising network.\nAnd so much more.`}</p>
              </ScrollFadeUp>
              <ScrollFadeUp index={2} duration={2.2} start="top 74%">
                <Image src="/images/home/figma/arrow-down.svg" alt="" width={242} height={242} className={styles.hero2ArrowDown} />
              </ScrollFadeUp>
            </div>

            <div className={styles.hero2Right}>
              <SplitLinesReveal duration={2.25} stagger={0.32} start="top 72%" className={styles.hero2Line2}>
                <h1 className={styles.hero2DisplayLine2}>IS FOR PEOPLE</h1>
              </SplitLinesReveal>

              <SplitLinesReveal duration={2.25} stagger={0.32} start="top 72%" className={styles.hero2Line3}>
                <h2 className={styles.hero2DisplayLine3}>WHO ARE MAKING</h2>
              </SplitLinesReveal>

              <SplitLinesReveal duration={2.25} stagger={0.32} start="top 72%" className={styles.hero2Line4}>
                <h2 className={styles.hero2DisplayLine4}>THE WORLD.</h2>
              </SplitLinesReveal>
            </div>
          </div>

          <div className={styles.scrollRow}>
            <p className={styles.bodyXl}>Discover what we can do for you</p>
            <p className={styles.bodyXl}>(SCROLL)</p>
          </div>

          <div className={styles.videoBlock}>
            <ScrollGrowDockPin
              dockTargetSelector="[data-gs-home-media-final-target]"
              pinUntilSelector="[data-gs-home-media-pin-end]"
              startScale={1}
              holdBefore={0.2}
              start="center center"
              dockAt="top 68%"
              dockOffsetY={-400}
            >
              <ScrollFadeUp index={0}>
                <video
                  data-gs-home-media-source
                  src="/images/home/ship2.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                  preload="auto"
                  disablePictureInPicture
                  className={styles.heroVideo}
                />
              </ScrollFadeUp>
            </ScrollGrowDockPin>
          </div>

          <section data-gs-home-harmony className={styles.harmony}>
            <header className={styles.harmonyHeadline}>
              <hgroup className={styles.harmonyTextBlock}>
                <SplitLinesReveal>
                  <h2 className={styles.harmonyH9}>HARMONY</h2>
                </SplitLinesReveal>
                <div className={styles.harmonySecondLine}>
                  <SplitLinesReveal>
                    <p className={styles.harmonyH9}>NOT</p>
                  </SplitLinesReveal>
                  <SplitLinesReveal>
                    <p className={styles.harmonyH9}>HYPE</p>
                  </SplitLinesReveal>
                </div>
              </hgroup>
              <div data-gs-home-media-target className={styles.redTarget} />
            </header>

            <div className={styles.twoCol}>
              <div className={styles.thinkBigCol}>
                <p className={styles.bodyXl}>Think big with us.</p>
                <div data-gs-home-media-final-target className={styles.mediaFinalTarget} />
              </div>
              <div className={styles.stack44}>
                <SplitLinesReveal>
                  <h3 className={styles.harmonyLead}>Great connections are more than contacts, they&apos;re Ideas aligning in Harmony.</h3>
                </SplitLinesReveal>
                <p className={styles.body2xl}>
                  We partner with soul-aligned companies to create impactful, future-ready partnerships. We collaborate with visionary teams and design-led companies that require support in company positioning, category definition, and brand expression to unify their team, drive growth, and amplify brand influence in modern culture.
                </p>
              </div>
            </div>

            <div data-gs-home-media-pin-end className={styles.twoCol}>
              <p className={styles.bodyXl}>Explore Us.</p>
              <div className={styles.exploreCol}>
                <SplitLinesReveal>
                  <p className={styles.bodyXl}>(CHOOSE YOUR PURPOSE)</p>
                </SplitLinesReveal>
                <div className={styles.exploreLinks}>
                  {exploreLinks.map((item) => (
                    <Link key={item.label} href={item.href} className={styles.exploreLink}>
                      <span>{item.label}</span>
                      <Image src="/images/home/icon-arrow-right.svg" alt="" width={40} height={40} className={styles.arrowRight} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.trustedWrap}>
              <p className={styles.bodyXl}>(TRUSTED BY)</p>
              <div className={styles.trustedGrid}>
                {trustedRows.map((_, index) => (
                  <div key={index} className={styles.trustedItem}>
                    <Image src="/images/home/figma/trusted-logo-mark.svg" alt="" width={73} height={59} className={styles.trustedMark} />
                    <Image src="/images/home/figma/trusted-logo-wordmark.svg" alt="" width={106} height={58} className={styles.trustedWordmark} />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.impactWrap}>
              <SplitLinesReveal>
                <h2 className={styles.impactHeadline}>{`THE RIGHT AUDIENCE\nCHANGES EVERYTHING`}</h2>
              </SplitLinesReveal>
              <div className={styles.impactBody}>
                <div className={styles.impactImageWrap}>
                  <Image
                    src="/images/home/figma/mariah.png"
                    alt="Classical sculpture"
                    width={848}
                    height={940}
                    className={styles.impactImage}
                  />
                </div>
                <div className={styles.impactTextWrap}>
                  <SplitLinesReveal>
                    <h3 className={styles.harmonyLead}>Turn aligned values into orchestral impact.</h3>
                  </SplitLinesReveal>
                  <SplitLinesReveal>
                    <p className={styles.body2xl}>
                      Traditional advertising falls short because it stops at the surface, logos, taglines, campaigns. We go deeper, aligning your business around underlying and shared values. The result? A brand your people will champion and your audience will love.
                    </p>
                  </SplitLinesReveal>
                  <SplitLinesReveal>
                    <Link href="/what-is-this" className={styles.learnMore}>
                      LEARN MORE
                    </Link>
                  </SplitLinesReveal>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Image src="/images/home/figma/footer-mark-dark.gif" alt="Ghost Signal mark" width={155} height={145} unoptimized className={styles.footerMark} />
          <div className={styles.footerWordmark}>
            <Image src="/images/home/figma/footer-wordmark-ghost.svg" alt="Ghost" width={289.978} height={57.7955} className={styles.footerWordmarkLeft} />
            <Image src="/images/home/figma/footer-wordmark-signal.svg" alt="Signal" width={219.702} height={71.9804} className={styles.footerWordmarkRight} />
          </div>
        </div>

        <nav className={styles.footerNav} aria-label="Footer">
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Discover</h4>
            <ul className={styles.footerColLinks}>
              <li><Link href="/for-creators">FOR CREATORS</Link></li>
              <li><Link href="/for-brands">FOR BRANDS</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Company</h4>
            <ul className={styles.footerColLinks}>
              <li><Link href="/who-are-we">WHO WE ARE</Link></li>
              <li><Link href="/what-is-this">WHAT IS THIS</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Learn</h4>
            <ul className={styles.footerColLinks}>
              <li><Link href="/snowdrift">SNOWDRIFT</Link></li>
            </ul>
          </div>
        </nav>

        <div className={styles.footerSocial}>
          <a href="https://www.linkedin.com/company/ghostsignal" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialLink}>
            <Image src="/images/home/figma/social-linkedin-outline.svg" alt="" width={24} height={24} className={styles.socialIcon} />
          </a>
          <a href="https://www.facebook.com/ghostsignal" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.socialLink}>
            <Image src="/images/home/figma/social-facebook.svg" alt="" width={24} height={24} className={styles.socialIcon} />
          </a>
          <a href="https://www.instagram.com/ghostsignal" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink}>
            <Image src="/images/home/figma/social-instagram.svg" alt="" width={24} height={24} className={styles.socialIcon} />
          </a>
        </div>
      </footer>
    </main>
  );
}

