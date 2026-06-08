"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./SpinningLogo3D.module.css";

type Props = {
  className?: string;
};

const DEPTH_LAYERS = 20; // Number of layers for depth effect
const DEPTH_PX = 24; // Total depth in pixels
const HALF_DEPTH = DEPTH_PX / 2;

export function SpinningLogo3D({ className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  // Generate depth layers from front to back (centered at Z=0)
  const depthLayers = Array.from({ length: DEPTH_LAYERS }, (_, i) => {
    // Spread layers from +HALF_DEPTH to -HALF_DEPTH
    const z = HALF_DEPTH - (i * (DEPTH_PX / (DEPTH_LAYERS - 1)));
    return (
      <div
        key={i}
        className={styles.depthLayer}
        style={{ transform: `translateZ(${z}px)` }}
      >
        <Image
          src="/images/what-is-this/logo-white1.svg"
          alt=""
          width={309}
          height={263}
          className={styles.logo}
        />
      </div>
    );
  });

  return (
    <div className={`${styles.container} ${className}`}>
      <div ref={containerRef} className={styles.logoWrapper}>
        {/* Front face */}
        <div className={styles.face} style={{ transform: `translateZ(${HALF_DEPTH}px)` }}>
          <Image
            src="/images/what-is-this/logo-white1.svg"
            alt="GhostSignal"
            width={309}
            height={263}
            className={styles.logo}
          />
        </div>

        {/* Depth layers (edge/thickness) - no backface culling */}
        {depthLayers}

        {/* Back face - flipped horizontally so logo reads correctly from behind */}
        <div
          className={styles.face}
          style={{ transform: `translateZ(${-HALF_DEPTH}px) rotateY(180deg) scaleX(-1)` }}
        >
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
