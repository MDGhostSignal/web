"use client";

import { useEffect, useRef, useState } from "react";

import { ensureGsapPlugins, gsap, ScrollTrigger } from "@/motion/gsap";

import type { ChapterDef } from "./chapters";
import { chapterRunwayVh } from "./chapters";

export type ChapterProgress = Record<string, number>;

/**
 * Native-scroll story engine: each chapter is a tall runway; its sticky
 * stage scrubs 0→1 across that runway (Notturno's heightWorld multiples,
 * without Hydra virtual scroll).
 */
export function useStoryScroll(chapters: ChapterDef[]) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState<ChapterProgress>({});
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? "");

  useEffect(() => {
    ensureGsapPlugins();
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const triggers: ScrollTrigger[] = [];
    const next: ChapterProgress = {};

    chapters.forEach((ch) => {
      const runway = root.querySelector<HTMLElement>(`[data-runway="${ch.id}"]`);
      const stage = root.querySelector<HTMLElement>(`[data-stage="${ch.id}"]`);
      if (!runway || !stage) return;

      next[ch.id] = reduced ? 1 : 0;

      if (reduced) return;

      const st = ScrollTrigger.create({
        trigger: runway,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
        onUpdate: (self) => {
          const p = self.progress;
          setProgress((prev) =>
            prev[ch.id] === p ? prev : { ...prev, [ch.id]: p },
          );
          if (self.isActive) {
            setActiveId((prev) => (prev === ch.id ? prev : ch.id));
          }
        },
        onEnter: () => setActiveId(ch.id),
        onEnterBack: () => setActiveId(ch.id),
      });
      triggers.push(st);

      const media = stage.querySelector<HTMLElement>("[data-parallax]");
      if (media) {
        const tween = gsap.fromTo(
          media,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: {
              trigger: runway,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          },
        );
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      }
    });

    if (reduced) {
      const id = requestAnimationFrame(() => setProgress(next));
      ScrollTrigger.refresh();
      return () => {
        cancelAnimationFrame(id);
        triggers.forEach((t) => t.kill());
      };
    }

    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, [chapters]);

  return { rootRef, progress, activeId, chapterRunwayVh };
}
