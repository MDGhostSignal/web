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

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Starry background */}
      <div className={styles.stars} />
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
