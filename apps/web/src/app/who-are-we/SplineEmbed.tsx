"use client";

import Script from "next/script";
import styles from "./page.module.css";

interface SplineEmbedProps {
  scene: string;
}

export default function SplineEmbed({ scene }: SplineEmbedProps) {
  return (
    <div className={styles.splineWrapper}>
      <Script
        type="module"
        src="https://unpkg.com/@splinetool/viewer@1.12.79/build/spline-viewer.js"
        strategy="lazyOnload"
      />
      {/* @ts-expect-error - spline-viewer is a custom element */}
      <spline-viewer
        url={scene}
        style={{ width: "100%", height: "100%" }}
        hint="false"
        loading-anim-type="none"
      />
    </div>
  );
}
