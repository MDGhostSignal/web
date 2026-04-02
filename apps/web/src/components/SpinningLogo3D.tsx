"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./SpinningLogo3D.module.css";

type Props = {
  className?: string;
};

export function SpinningLogo3D({ className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Optional: Add scroll-based rotation speed adjustment
    const container = containerRef.current;
    if (!container) return;

    let rotation = 0;
    let animationId: number;

    const animate = () => {
      rotation += 0.3; // Slow rotation speed
      container.style.transform = `perspective(1000px) rotateY(${rotation}deg)`;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className={`${styles.container} ${className}`}>
      <div ref={containerRef} className={styles.logoWrapper}>
        {/* Front face */}
        <div className={styles.face}>
          <Image
            src="/images/what-is-this/logo-white1.svg"
            alt="GhostSignal"
            width={309}
            height={263}
            className={styles.logo}
          />
        </div>
        {/* Back face (mirrored) */}
        <div className={`${styles.face} ${styles.back}`}>
          <Image
            src="/images/what-is-this/logo-white1.svg"
            alt=""
            width={309}
            height={263}
            className={styles.logo}
          />
        </div>
      </div>
    </div>
  );
}
