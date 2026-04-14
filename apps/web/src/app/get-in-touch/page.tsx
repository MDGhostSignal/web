import Image from "next/image";

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

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.contactContent}>
          <div className={styles.contactText}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.contactEyebrow}>GET IN TOUCH</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={1.8} stagger={0.28}>
              <h1 className={styles.contactHeadline}>
                EVERY PARTNERSHIP STARTS WITH A CHAT
              </h1>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.contactBody}>
                Podcaster or Advertiser, ready to find your frequency? Schedule a call.
              </p>
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
            <Image
              src="/images/for-creators/jeremycontact.jpg"
              alt="Jeremy"
              width={350}
              height={350}
              className={styles.contactPhoto}
            />
          </div>
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

      <Footer />
    </main>
  );
}
