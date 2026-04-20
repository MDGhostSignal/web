"use client";

import Image from "next/image";
import Link from "next/link";

import { ScrollFadeUp } from "@/motion/ScrollFadeUp";

import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={`${styles.footer} js-s-hide-sh`}>
      <div className={styles.footerTop}>
        <ScrollFadeUp index={0} duration={1.4}>
          <Link href="/" className={styles.footerLogoLink}>
            <Image
              src="/images/home/figma/footer-mark-dark.gif"
              alt="Ghost Signal - Back to home"
              width={155}
              height={145}
              unoptimized
              className={styles.footerMark}
            />
          </Link>
        </ScrollFadeUp>
      </div>

      <nav className={styles.footerNav} aria-label="Footer">
        <div className={styles.footerCol}>
          <ScrollFadeUp index={1} duration={1.4}>
            <h4 className={styles.footerColTitle}>Discover</h4>
          </ScrollFadeUp>
          <ul className={styles.footerColLinks}>
            <ScrollFadeUp index={2} duration={1.4}>
              <li><Link href="/for-creators">FOR CREATORS</Link></li>
            </ScrollFadeUp>
            <ScrollFadeUp index={3} duration={1.4}>
              <li><Link href="/for-advertisers">FOR ADVERTISERS</Link></li>
            </ScrollFadeUp>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <ScrollFadeUp index={1} duration={1.4}>
            <h4 className={styles.footerColTitle}>Company</h4>
          </ScrollFadeUp>
          <ul className={styles.footerColLinks}>
            <ScrollFadeUp index={2} duration={1.4}>
              <li><Link href="/who-are-we">WHO ARE WE?</Link></li>
            </ScrollFadeUp>
            <ScrollFadeUp index={3} duration={1.4}>
              <li><Link href="/what-is-this">WHAT IS THIS</Link></li>
            </ScrollFadeUp>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <ScrollFadeUp index={1} duration={1.4}>
            <h4 className={styles.footerColTitle}>Learn</h4>
          </ScrollFadeUp>
          <ul className={styles.footerColLinks}>
            <ScrollFadeUp index={2} duration={1.4}>
              <li><Link href="/snowdrift">SNOWDRIFT</Link></li>
            </ScrollFadeUp>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <ScrollFadeUp index={1} duration={1.4}>
            <h4 className={styles.footerColTitle}>Resources</h4>
          </ScrollFadeUp>
          <ul className={styles.footerColLinks}>
            <ScrollFadeUp index={2} duration={1.4}>
              <li><Link href="/signal-sheet">THE SIGNAL SHEET</Link></li>
            </ScrollFadeUp>
          </ul>
        </div>
      </nav>

      <ScrollFadeUp index={4} duration={1.4}>
        <div className={styles.footerMorse}>
          <p className={styles.morseCode}>
            -.-. -. - ... - --- .--. - .... . ... .. --. -. .- .-..
          </p>
        </div>
      </ScrollFadeUp>

      <div className={styles.footerSocial}>
        <ScrollFadeUp index={5} duration={1.4}>
          <a
            href="https://www.instagram.com/ghostsignal.cloud"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className={styles.socialLink}
          >
            <Image
              src="/images/home/figma/social-instagram.svg"
              alt=""
              width={24}
              height={24}
              className={styles.socialIcon}
            />
          </a>
        </ScrollFadeUp>
        <ScrollFadeUp index={6} duration={1.4}>
          <a
            href="https://www.linkedin.com/company/108297128"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className={styles.socialLink}
          >
            <Image
              src="/images/home/figma/social-linkedin-outline.svg"
              alt=""
              width={24}
              height={24}
              className={styles.socialIcon}
            />
          </a>
        </ScrollFadeUp>
        <ScrollFadeUp index={7} duration={1.4}>
          <a
            href="https://www.facebook.com/ghostsignal.cloud"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className={styles.socialLink}
          >
            <Image
              src="/images/home/figma/social-facebook.svg"
              alt=""
              width={24}
              height={24}
              className={styles.socialIcon}
            />
          </a>
        </ScrollFadeUp>
      </div>
    </footer>
  );
}
