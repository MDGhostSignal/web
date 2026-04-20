"use client";

import { type ReactNode, useId } from "react";

import { ensureGsapPlugins, gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

type Props = {
  children: ReactNode;
  /**
   * Mirrors Motto's list reveal: y=60, opacity=0 → y=0, opacity=1.
   * If you need consistent staggering, pass a stable index.
   */
  index?: number;
  /**
   * Motto uses `start: "top bottom"` for many reveals.
   */
  start?: string;
  duration?: number;
  /**
   * Optional fixed delay (in seconds) before the animation starts.
   * Added to index-based stagger delay.
   */
  delay?: number;
  /**
   * Pixel distance the element translates upward during entrance.
   * Set to `0` when a parent/child already animates `y` (e.g. `ParallaxY`)
   * to keep the fade opacity-only and avoid fighting transforms.
   */
  distance?: number;
  /**
   * Optional className to apply to the wrapper div.
   * Helps reduce unnecessary nesting when the wrapper can serve double duty.
   */
  className?: string;
};

/**
 * Mirrors Motto's common scroll entrance animation:
 * `fromTo(el, { y:60, opacity:0 }, { y:0, opacity:1, duration:1, ease:"power2.out", delay: 0.1*index, scrollTrigger:{trigger: el, start:"top bottom"} })`
 */
export function ScrollFadeUp({
  children,
  index = 0,
  start = "top 78%",
  duration = 1.7,
  delay = 0,
  distance = 60,
  className,
}: Props) {
  const id = useId();

  useIsomorphicLayoutEffect(() => {
    ensureGsapPlugins();
    const el = document.querySelector<HTMLElement>(`[data-gs-sfu="${id}"]`);
    if (!el) return;

    const tween = gsap.fromTo(
      el,
      { y: distance, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration,
        ease: "power2.out",
        delay: delay + 0.14 * index,
        scrollTrigger: { trigger: el, start },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, distance, duration, id, index, start]);

  return <div data-gs-sfu={id} className={className}>{children}</div>;
}

