"use client";

import { useEffect, useState } from "react";

import styles from "./page.module.css";

/**
 * Full-bleed looping hero background for /invitation.
 *
 * Muted + autoplay + loop + playsInline so it runs as ambient
 * background everywhere (iOS only autoplays a muted, inline video).
 * Sources are ordered smallest-first: WebM/VP9 (~200 KB) for browsers
 * that take it, H.264 MP4 (~1.3 MB) as the universal fallback.
 *
 * Under `prefers-reduced-motion: reduce` we render the poster still
 * instead — motion-sensitive users get a calm static image and we never
 * fetch the video at all.
 */
export function HeroBackgroundVideo() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (reduced) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed background poster (already an optimized ~32KB still); next/image fill adds no value for a reduced-motion-only background
      <img
        src="/videos/invitation-hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className={`${styles.heroVideo} ${styles.heroVideoMedia}`}
      />
    );
  }

  return (
    <video
      className={`${styles.heroVideo} ${styles.heroVideoMedia}`}
      autoPlay
      muted
      loop
      playsInline
      poster="/videos/invitation-hero-poster.jpg"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src="/videos/invitation-hero.webm" type="video/webm" />
      <source src="/videos/invitation-hero.mp4" type="video/mp4" />
    </video>
  );
}
