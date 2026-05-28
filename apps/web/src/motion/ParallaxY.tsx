"use client";

import { type ReactNode, useId } from "react";

import { ensureGsapPlugins, gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

type Props = {
  children: ReactNode;
  /**
   * Mirrors Motto's `data-parallax` default: ["-10rem", "10rem"]
   */
  range?: [string, string];
};

/**
 * Mirrors Motto's generic parallax:
 * `fromTo(el, { y: range[0] }, { y: range[1], ease:"none", scrollTrigger:{ trigger: el.parentNode, scrub:true } })`
 */
export function ParallaxY({ children, range = ["-10rem", "10rem"] }: Props) {
  const id = useId();

  useIsomorphicLayoutEffect(() => {
    ensureGsapPlugins();
    const el = document.querySelector<HTMLElement>(`[data-gs-parallax-y="${id}"]`);
    if (!el) return;
    const trigger = el.parentElement ?? el;

    // Position drift from font swap is corrected by
    // ScrollTriggerOrchestrator's post-fonts-ready refresh.
    const tween = gsap.fromTo(
      el,
      { y: range[0] },
      { y: range[1], ease: "none", scrollTrigger: { trigger, scrub: true } },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [id, range]);

  return <div data-gs-parallax-y={id}>{children}</div>;
}

