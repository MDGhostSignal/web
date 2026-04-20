"use client";

import { useEffect } from "react";

import { ScrollTrigger, ensureGsapPlugins } from "@/motion/gsap";

/**
 * Below-fold motion primitives register their ScrollTriggers in
 * `useLayoutEffect`, measuring element positions *before* fonts swap,
 * images load, or lazy content (Lottie, dynamic backgrounds) hydrates.
 * When those shift content down, the cached start positions become
 * stale — triggers fire at scroll positions earlier than the element
 * visually reaches. This orchestrator refreshes ScrollTrigger once the
 * page has actually settled.
 */
export function ScrollTriggerOrchestrator() {
  useEffect(() => {
    ensureGsapPlugins();

    let disposed = false;
    const refresh = () => {
      if (!disposed) ScrollTrigger.refresh();
    };

    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(refresh).catch(() => {});
    }

    if (document.readyState === "complete") {
      refresh();
    } else {
      window.addEventListener("load", refresh, { once: true });
    }

    let debounceId: number | undefined;
    const observer = new ResizeObserver(() => {
      if (debounceId !== undefined) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(refresh, 150);
    });
    observer.observe(document.body);

    return () => {
      disposed = true;
      window.removeEventListener("load", refresh);
      if (debounceId !== undefined) window.clearTimeout(debounceId);
      observer.disconnect();
    };
  }, []);

  return null;
}
