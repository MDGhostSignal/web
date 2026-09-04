"use client";

import Link from "next/link";

import { CHAPTERS } from "./chapters";
import { renderChapterScene } from "./scenes";
import { useStoryScroll } from "./useStoryScroll";
import styles from "./page.module.css";

/**
 * /what-is-this-v2 — LOCAL DRAFT.
 * Each chapter is a unique scene composition (Notturno-inspired variety),
 * not a repeated template with swapped colors.
 */

export default function WhatIsThisV2Page() {
  const { rootRef, progress, activeId } = useStoryScroll(CHAPTERS);

  return (
    <main className={styles.page} ref={rootRef}>
      <div className={styles.draftBanner} role="status">
        <span className={styles.draftBadge}>DRAFT</span>
        <span className={styles.draftCopy}>
          WIT v2 · unique scenes · placeholders · local only
        </span>
        <Link href="/what-is-this" className={styles.draftLink}>
          Live page
        </Link>
      </div>

      <nav className={styles.chapterRail} aria-label="Story chapters">
        {CHAPTERS.map((ch) => (
          <a
            key={ch.id}
            href={`#${ch.id}`}
            className={styles.chapterRailLink}
            data-active={activeId === ch.id ? "true" : "false"}
            onClick={(e) => {
              e.preventDefault();
              document
                .querySelector(`[data-runway="${ch.id}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <span className={styles.chapterRailIndex}>{ch.index}</span>
            <span className={styles.chapterRailLabel}>{ch.label}</span>
          </a>
        ))}
      </nav>

      {CHAPTERS.map((ch) => (
        <section key={ch.id} id={ch.id} className={styles.chapterAnchor}>
          {renderChapterScene({
            chapter: ch,
            progress: progress[ch.id] ?? 0,
            isActive: activeId === ch.id,
            // Always pass desktop height; SceneShell applies mobile via CSS.
            runwayVh: ch.height,
          })}
        </section>
      ))}

      <footer className={styles.storyFooter}>
        <p className={styles.storyFooterNote}>
          Each beat is a distinct composition — zoom, parallax strip, crop,
          tunnel, iris, fan, pour, vortex, panorama, assembling grid.
        </p>
        <div className={styles.storyFooterLinks}>
          <Link href="/what-is-this">Live What Is This</Link>
          <Link href="/">Home</Link>
        </div>
      </footer>
    </main>
  );
}
