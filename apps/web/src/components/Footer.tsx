import Image from "next/image";
import Link from "next/link";

import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <Image
          src="/images/home/figma/footer-mark-dark.gif"
          alt="Ghost Signal mark"
          width={155}
          height={145}
          unoptimized
          className={styles.footerMark}
        />
        <div className={styles.footerWordmark}>
          <Image
            src="/images/home/figma/footer-wordmark-ghost.svg"
            alt="Ghost"
            width={145}
            height={29}
            className={styles.footerWordmarkLeft}
          />
          <Image
            src="/images/home/figma/footer-wordmark-signal.svg"
            alt="Signal"
            width={110}
            height={36}
            className={styles.footerWordmarkRight}
          />
        </div>
      </div>

      <nav className={styles.footerNav} aria-label="Footer">
        <div className={styles.footerCol}>
          <h4 className={styles.footerColTitle}>Discover</h4>
          <ul className={styles.footerColLinks}>
            <li><Link href="/for-creators">FOR CREATORS</Link></li>
            <li><Link href="/for-advertisers">FOR BRANDS</Link></li>
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

      <div className={styles.footerMorse}>
        <p className={styles.morseCode}>
          -.-. -. - ... - --- .--. - .... . ... .. --. -. .- .-..
        </p>
      </div>

      <div className={styles.footerSocial}>
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
      </div>
    </footer>
  );
}
