"use client";

import Image from "next/image";
import Link from "next/link";

import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "./ContactSection.module.css";

interface ContactSectionProps {
  /** Image to display in the visual area. Defaults to Jeremy's photo. */
  imageSrc?: string;
  /** Alt text for the contact photo */
  imageAlt?: string;
}

export function ContactSection({
  imageSrc = "/images/for-creators/jeremycontact.jpg",
  imageAlt = "Jeremy",
}: ContactSectionProps) {
  return (
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
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={350}
            height={350}
            className={styles.contactPhoto}
          />
        </div>
      </div>
    </section>
  );
}
