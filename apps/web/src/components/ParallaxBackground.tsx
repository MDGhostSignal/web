"use client";

import { useEffect, useRef } from "react";
import styles from "./ParallaxBackground.module.css";

type Props = {
  /**
   * Optional cloud / image overlay on top of the starry background.
   * When omitted, only the twinkling star layer renders.
   */
  imageSrc?: string;
  speed?: number; // 0 = fixed, 1 = scrolls with page, 0.5 = half speed (default)
  className?: string;
};

export function ParallaxBackground({ imageSrc, speed = 0.3, className = "" }: Props) {
  const bgRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageSrc) return;
    const bg = bgRef.current;
    if (!bg) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const translateY = scrollY * speed;
      bg.style.transform = `translate3d(0, ${translateY}px, 0)`;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [imageSrc, speed]);

  // Very subtle scroll-driven parallax on the two star layers — the
  // brighter layer drifts about twice as fast as the dim layer so the
  // starfield reads as having depth, but the magnitude is small
  // enough that the motion is barely perceptible. Driven via CSS
  // custom properties consumed by `.stars::before` / `.stars::after`
  // as background-position offsets (transforms would create edge
  // gaps; bg-position lets the tiled pattern wrap cleanly).
  useEffect(() => {
    const stars = starsRef.current;
    if (!stars) return;
    let frame = 0;
    let lastY = -1;
    const apply = () => {
      frame = 0;
      const scrollY = window.scrollY;
      if (scrollY === lastY) return;
      lastY = scrollY;
      stars.style.setProperty("--star-y-1", `${(scrollY * -0.04).toFixed(1)}px`);
      stars.style.setProperty("--star-y-2", `${(scrollY * -0.02).toFixed(1)}px`);
    };
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Starry background */}
      <div ref={starsRef} className={styles.stars} />
      {imageSrc ? (
        <div
          ref={bgRef}
          className={styles.background}
          style={{ backgroundImage: `url(${imageSrc})` }}
        />
      ) : null}
    </div>
  );
}
