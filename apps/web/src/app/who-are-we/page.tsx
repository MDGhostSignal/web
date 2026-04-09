import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
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

const founders = [
  {
    name: "Jack W Harding",
    role: "Cultural & Business Strategist",
    location: "Cambridge, UK",
    linkedin: "https://www.linkedin.com/in/jackwharding",
    bio: "Jack is animated by the belief that the world changes when good creators and good brands find each other. With a background in business strategy, research, and podcasting, he loves to help meaningful ideas reach their audience. In co-founding GHOSTSignal, Jack's aim is to amplify good signals that cut through static that dulls culture. He also serves with a Christian cultural apologetics ministry based in the United States.",
    image: "/images/team/GS-EmailSignatures-jackw.gif",
  },
  {
    name: "Jeremy Reeves",
    role: "Creative Strategist",
    location: "Colorado Springs, CO",
    linkedin: "https://www.linkedin.com/in/jeremy-reeves-5365b036a/",
    bio: "Jeremy is driven by the moment a person sees something new—an insight, a possibility, a truer version of themselves—and by helping them reach it. He has guided individuals through coaching, shaped brand culture and identity for companies, and supported institutions navigating major change. His motivation in co-founding GHOSTSignal is to help build a future where good creators and good companies meet in alignment and make the kind of world we all want.",
    image: "/images/team/GS-EmailSignatures-jeremyw.gif",
  },
  {
    name: "Martin Drexler",
    role: "Design",
    location: "Munich, Germany",
    linkedin: "https://www.linkedin.com/in/whoismartindrexler/",
    bio: "Martin is an award-winning German designer known for blending creativity, strategy, and measurable impact. With more than 25 international honors—including the German Brand Award in Gold and D&AD Gold—he has led branding and digital experience projects across Europe and the U.S. His craft is rooted in storytelling, user-centered design, and analytical clarity. As a co-founder of GHOSTSignal, Martin brings his passion for shaping meaningful experiences to a new frontier of creator–brand partnership.",
    image: "/images/team/GS-EmailSignatures-martinw.gif",
  },
  {
    name: "Mike Sense",
    role: "Vision & Partnerships",
    location: "Prague, Czechia",
    linkedin: "https://www.linkedin.com/in/mike-sense/",
    bio: "Mike is good at understanding two important questions: What is a person? And what is shaping the future? He has an appetite for risk-taking adventures, which has resulted in starting two companies that solve real problems that real people encounter in the real world. For him, GHOSTSignal is not just a fun company with friends, but a mission fuelled by curiosity and conviction. Mike resides in Prague, Czech Republic with his family.",
    image: "/images/team/GS-EmailSignatures-mikew.gif",
  },
] as const;

const promises = [
  {
    audience: "For Podcasters",
    text: "We protect your voice. Every partnership will feel like an extension of your mission—not an interruption.",
  },
  {
    audience: "For Advertisers",
    text: "We connect you with creators whose audiences trust them, and whose convictions align with yours. That trust is priceless — we won't compromise it.",
  },
  {
    audience: "For Both",
    text: "Transparency, clarity, and generosity. Every deal is a win-win.",
  },
] as const;

export const metadata = {
  title: "Who Are We | GhostSignal",
  description: "GHOSTSignal is a partner-making force. We believe the future of advertising is soulful.",
};

export default function WhoAreWePage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true" />
        <div className={styles.heroContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              GHOSTSignal is a partner-making force.
            </h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.8}>
            <p className={styles.heroSubhead}>
              We believe the future of advertising is soulful.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Mission Statement Section */}
      <section className={styles.missionSection}>
        <div className={styles.missionContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.missionText}>
              GHOSTSignal was created as an act of world making, to help you make yours.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.missionText}>
              We believe that advertising doesn&apos;t have to be extractive, it can be creative and good.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.6}>
            <p className={styles.missionText}>
              Our goal is to see creators, thinkers, and doers in good partnerships that support their work, and good companies to have their story heard by audiences with whom they resonate.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={3} duration={1.6}>
            <p className={styles.missionHighlight}>
              We make partnerships with soul and resonance, so you can make a world of harmony and goodness.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Team Section */}
      <section className={styles.teamSection}>
        <div className={styles.teamContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.teamHeadline}>
              WE are a team COMMITTED TO the world we are making.
            </h2>
          </ScrollFadeUp>

          <div className={styles.foundersGrid}>
            {founders.map((founder, index) => (
              <ScrollFadeUp key={founder.name} index={index} duration={1.8}>
                <article className={styles.founderCard}>
                  <Image
                    src={founder.image}
                    alt={`${founder.name} - Co-Founder, ${founder.role}, ${founder.location}`}
                    width={400}
                    height={100}
                    unoptimized
                    className={styles.founderCardImage}
                  />
                  <div className={styles.founderBio}>
                    <p>{founder.bio}</p>
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkedinLink}
                    >
                      Connect on LinkedIn
                    </a>
                  </div>
                </article>
              </ScrollFadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Promises Section */}
      <section className={styles.promisesSection}>
        <div className={styles.promisesContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.promisesHeadline}>WE PROMISE</h2>
          </ScrollFadeUp>

          <div className={styles.promisesGrid}>
            {promises.map((promise, index) => (
              <ScrollFadeUp key={promise.audience} index={index + 1} duration={1.6}>
                <article className={styles.promiseCard}>
                  <h3 className={styles.promiseAudience}>{promise.audience}</h3>
                  <p className={styles.promiseText}>{promise.text}</p>
                </article>
              </ScrollFadeUp>
            ))}
          </div>

          <ScrollFadeUp index={4} duration={1.6}>
            <p className={styles.promisesClosing}>
              We cultivate resonance so you can make harmony.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp index={5} duration={1.6}>
            <Link href="/get-in-touch" className={styles.primaryButton}>
              Find Your Frequency
            </Link>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.contactContent}>
          <div className={styles.contactText}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.contactEyebrow}>GET IN TOUCH</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={1.8} stagger={0.28}>
              <h2 className={styles.contactHeadline}>
                EVERY PARTNERSHIP STARTS WITH A CHAT
              </h2>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.contactBody}>
                Podcaster or Advertiser, ready to find your frequency? Schedule a call.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.6}>
              <Link href="/get-in-touch" className={styles.contactCta}>
                Email Us
                <Image
                  src="/images/home/icon-arrow-right.svg"
                  alt=""
                  width={24}
                  height={24}
                  className={styles.ctaArrow}
                />
              </Link>
            </ScrollFadeUp>
          </div>
          <div className={styles.contactVisual}>
            <Image
              src="/images/home/figma/bars.png"
              alt="Colorful horizontal lines representing the signal"
              width={400}
              height={300}
              className={styles.contactBars}
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
