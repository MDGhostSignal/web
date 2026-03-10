"use client";

import { type ReactNode, useId } from "react";

import SplitType from "split-type";

import { ensureGsapPlugins, gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

type Props = {
  children: ReactNode;
  /**
   * Matches Motto:
   * duration: 1.25, stagger: 0.2, ease: "expo"
   */
  duration?: number;
  stagger?: number;
  ease?: string;
  /**
   * Optional additional delay (in seconds) after the ScrollTrigger fires.
   * Useful for sequencing multiple SplitLinesReveal blocks.
   */
  delay?: number;
  start?: string;
};

/**
 * Mirrors Motto's `[data-split]` behavior:
 * - split into lines
 * - set line wrappers overflow hidden
 * - animate inner lines from yPercent 101 → 0 on scroll
 */
export function SplitLinesReveal({
  children,
  duration = 1.9,
  stagger = 0.28,
  ease = "expo",
  delay = 0,
  start = "top 76%",
}: Props) {
  const id = useId();

  useIsomorphicLayoutEffect(() => {
    ensureGsapPlugins();
    const el = document.querySelector<HTMLElement>(`[data-gs-split="${id}"]`);
    if (!el) return;

    const splitOuter = new SplitType(el, { types: "lines" });
    const splitInner = new SplitType(splitOuter.lines ?? [], { types: "lines" });

    if (splitOuter.lines?.length) {
      // Prevent descenders (e.g. "g") from getting clipped by the line mask.
      // Use token-based spacing so we don't invent hard-coded values.
      gsap.set(splitOuter.lines, {
        overflow: "hidden",
        // 8xl+ with lineHeight: 1em can clip on some renderers; give more room.
        paddingBottom: "calc(var(--gs-n-12) * var(--gs-px))",
        marginBottom: "calc(0px - (var(--gs-n-12) * var(--gs-px)))",
      });
    }

    const tween = gsap.fromTo(
      splitInner.lines ?? [],
      { yPercent: 101 },
      {
        yPercent: 0,
        duration,
        stagger,
        ease,
        delay,
        scrollTrigger: { trigger: el, start },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      splitInner.revert();
      splitOuter.revert();
    };
  }, [delay, duration, ease, id, stagger, start]);

  return <div data-gs-split={id}>{children}</div>;
}

