"use client";

import type { CSSProperties, ReactNode } from "react";

import type { ChapterBand, ChapterDef } from "../chapters";
import styles from "../scenes.module.css";

const BAND: Record<ChapterBand, string> = {
  void: styles.bandVoid,
  night: styles.bandNight,
  dawn: styles.bandDawn,
  signal: styles.bandSignal,
  day: styles.bandDay,
};

type Props = {
  chapter: ChapterDef;
  progress: number;
  isActive: boolean;
  runwayVh: number;
  children: ReactNode;
  /** Optional class on the sticky stage for scene-specific chrome. */
  stageClassName?: string;
};

/** Only shared runway mechanics — every scene owns its interior. */
export function SceneShell({
  chapter,
  progress,
  isActive,
  runwayVh,
  children,
  stageClassName,
}: Props) {
  const p = Math.min(1, Math.max(0, progress));
  const mobileVh = chapter.mobileHeight ?? chapter.height;

  return (
    <div
      className={`${styles.runway} ${BAND[chapter.band]}`}
      data-runway={chapter.id}
      data-kind={chapter.kind}
      data-active={isActive ? "true" : "false"}
      style={
        {
          // Desktop height from prop; mobile override via CSS var + media query
          // so SSR/client markup stays identical (no isMobile branch).
          ["--runway-vh" as string]: String(runwayVh),
          ["--runway-vh-mobile" as string]: String(mobileVh),
          minHeight: `calc(var(--runway-vh) * 100svh)`,
          marginTop: chapter.overlap
            ? `calc(${-chapter.overlap} * 100svh)`
            : undefined,
        } as CSSProperties
      }
    >
      <div
        className={`${styles.stage} ${stageClassName ?? ""}`}
        data-stage={chapter.id}
      >
        {children}
        <div className={styles.progressMeter} aria-hidden="true">
          <span
            className={styles.progressFill}
            style={{ transform: `scaleX(${p})` }}
          />
        </div>
      </div>
    </div>
  );
}

export function SceneCopy({
  chapter,
  className,
}: {
  chapter: ChapterDef;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className={styles.meta}>
        <span className={styles.index}>{chapter.index}</span>
        <span className={styles.eyebrow}>{chapter.eyebrow}</span>
        {chapter.interactive ? (
          <span className={styles.badge}>Interactive</span>
        ) : null}
      </p>
      <h2 className={styles.title}>
        {chapter.title.map((line) => (
          <span key={line} className={styles.titleLine}>
            {line}
          </span>
        ))}
      </h2>
      <p className={styles.body}>{chapter.body}</p>
    </div>
  );
}
