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

export const metadata = {
  title: "Get In Touch | GhostSignal",
  description: "Every partnership starts with a chat. Ready to find your frequency? Get in touch with the GhostSignal team.",
};

export default function GetInTouchPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              Every Partnership Starts With a Chat
            </h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.8}>
            <p className={styles.heroSubhead}>
              Are we right for each other?
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className={styles.formSection}>
        <div className={styles.formContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <form className={styles.contactForm} action="https://formspree.io/f/your-form-id" method="POST">
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName" className={styles.formLabel}>First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lastName" className={styles.formLabel}>Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Podcast or Advertiser?</span>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="type"
                      value="podcast"
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Podcast</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="type"
                      value="advertiser"
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>Advertiser</span>
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="website" className={styles.formLabel}>Your Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  placeholder="https://"
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="podcastOrProduct" className={styles.formLabel}>What is your podcast or product?</label>
                <textarea
                  id="podcastOrProduct"
                  name="podcastOrProduct"
                  rows={3}
                  className={styles.formTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="interest" className={styles.formLabel}>What has you interested in GHOSTSignal?</label>
                <textarea
                  id="interest"
                  name="interest"
                  rows={4}
                  className={styles.formTextarea}
                />
              </div>

              <button type="submit" className={styles.submitButton}>
                Submit
              </button>
            </form>
          </ScrollFadeUp>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <div className={styles.ctaText}>
            <ScrollFadeUp index={0} duration={1.6}>
              <h2 className={styles.ctaHeadline}>
                Ready to find your frequency? Schedule a call.
              </h2>
            </ScrollFadeUp>
            <ScrollFadeUp index={1} duration={1.6}>
              <a href="mailto:jeremy@ghostsignal.cloud" className={styles.ctaLink}>
                Email Us
                <Image
                  src="/images/home/icon-arrow-right.svg"
                  alt=""
                  width={24}
                  height={24}
                  className={styles.ctaArrow}
                />
              </a>
            </ScrollFadeUp>
          </div>
          <div className={styles.ctaVisual}>
            <ScrollFadeUp index={0} duration={1.8}>
              <div className={styles.visualStack}>
                <Image
                  src="/images/team/GS-EmailSignatures-jeremyw.gif"
                  alt="Jeremy Reeves - Creative Strategist"
                  width={400}
                  height={100}
                  unoptimized
                  className={styles.ctaImage}
                />
                <div className={styles.barsOverlay}>
                  <Image
                    src="/images/home/figma/bars.png"
                    alt=""
                    width={120}
                    height={200}
                    className={styles.barsImage}
                  />
                </div>
              </div>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
