"use client";

import { useEffect, useRef } from "react";
import styles from "./ParallaxBackground.module.css";

type Props = {
  imageSrc: string;
  speed?: number; // 0 = fixed, 1 = scrolls with page, 0.5 = half speed (default)
  className?: string;
};

export function ParallaxBackground({ imageSrc, speed = 0.3, className = "" }: Props) {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const translateY = scrollY * speed;
      bg.style.transform = `translate3d(0, ${translateY}px, 0)`;
    };

    // Initial position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Starry background behind parallax */}
      <div className={styles.stars} />
      <div
        ref={bgRef}
        className={styles.background}
        style={{ backgroundImage: `url(${imageSrc})` }}
      />
    </div>
  );
}
