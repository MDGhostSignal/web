"use client";

import { type ReactNode, useId } from "react";

import { ensureGsapPlugins, gsap, ScrollTrigger } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

type Props = {
  children: ReactNode;

  /**
   * Selector for the dock target element (in the Harmony section).
   * This element defines the final size/position of the pinned media.
   */
  dockTargetSelector: string;

  /**
   * Optional second dock target. If provided, media docks to the first target,
   * then transitions to this final target and remains there.
   */
  secondaryDockTargetSelector?: string;

  /**
   * Selector for the section we should keep the media pinned through.
   * Usually the Harmony section wrapper.
   */
  pinUntilSelector: string;

  /**
   * Initial scale for the media when entering the scroll range.
   * Unitless motion value.
   */
  startScale?: number;

  /**
   * Keep the media static for an initial portion of the scrub range before docking begins.
   * Range: 0..0.8
   */
  holdBefore?: number;

  /**
   * When the media should begin pinning/animating.
   */
  start?: string;

  /**
   * When the dock should be reached (used to compute the docking scroll position).
   */
  dockAt?: string;

  /**
   * Scroll trigger start expression used to compute when the secondary dock is reached.
   */
  secondaryDockAt?: string;

  /**
   * If true, the media will remain horizontally centered throughout (no x translation).
   */
  lockX?: boolean;

  /**
   * Final dock offset in pixels (applied after geometric docking).
   * Negative values move the docked media upward.
   */
  dockOffsetY?: number;
};

/**
 * One-element Motto-like choreography:
 * - Pin the media as you scroll into it
 * - Keep it centered initially
 * - Then shrink + move into a dock target (e.g. right-side whitespace by Harmony)
 * - Stay pinned there while the user scrolls through the section
 *
 * All geometry is computed from DOM measurements at refresh time (no hard-coded pixels).
 */
export function ScrollGrowDockPin({
  children,
  dockTargetSelector,
  secondaryDockTargetSelector,
  pinUntilSelector,
  startScale = 0.45,
  holdBefore = 0.18,
  start = "top center",
  dockAt = "top center",
  secondaryDockAt = "top center",
  lockX = false,
  dockOffsetY = 0,
}: Props) {
  const id = useId();

  useIsomorphicLayoutEffect(() => {
    ensureGsapPlugins();

    const wrap = document.querySelector<HTMLElement>(`[data-gs-sgdp="${id}"]`);
    const media = wrap?.querySelector<HTMLElement>("[data-gs-sgdp-media]");
    const dockTarget = document.querySelector<HTMLElement>(dockTargetSelector);
    const secondaryDockTarget = secondaryDockTargetSelector
      ? document.querySelector<HTMLElement>(secondaryDockTargetSelector)
      : null;
    const pinUntil = document.querySelector<HTMLElement>(pinUntilSelector);
    if (!wrap || !media || !dockTarget || !pinUntil) return;

    let dockPosTrigger: ScrollTrigger | null = null;
    let secondaryDockPosTrigger: ScrollTrigger | null = null;

    const compute = (pinTrigger: ScrollTrigger) => {
      const scrollY = window.scrollY || 0;
      const scrollX = window.scrollX || 0;

      // Measure "natural" media rect at scale 1 with no translation.
      const prevScale = gsap.getProperty(media, "scale") as number;
      const prevX = gsap.getProperty(media, "x") as number;
      const prevY = gsap.getProperty(media, "y") as number;
      gsap.set(media, { scale: 1, x: 0, y: 0 });

      const mediaRect = media.getBoundingClientRect();
      const dockRect = dockTarget.getBoundingClientRect();
      const secondaryDockRect = secondaryDockTarget?.getBoundingClientRect();

      gsap.set(media, { scale: prevScale, x: prevX, y: prevY });

      const mediaDocLeft = mediaRect.left + scrollX;
      const mediaDocTop = mediaRect.top + scrollY;
      const dockDocLeft = dockRect.left + scrollX;
      const dockDocTop = dockRect.top + scrollY;
      const secondaryDockDocLeft = secondaryDockRect ? secondaryDockRect.left + scrollX : 0;
      const secondaryDockDocTop = secondaryDockRect ? secondaryDockRect.top + scrollY : 0;

      // Scroll position when the dock target hits `dockAt`.
      if (!dockPosTrigger) {
        dockPosTrigger = ScrollTrigger.create({
          trigger: dockTarget,
          start: dockAt,
        });
      }
      const dockScrollY = dockPosTrigger.start;

      if (secondaryDockTarget && !secondaryDockPosTrigger) {
        secondaryDockPosTrigger = ScrollTrigger.create({
          trigger: secondaryDockTarget,
          start: secondaryDockAt,
        });
      }
      const secondaryDockScrollY = secondaryDockPosTrigger?.start ?? dockScrollY;

      // X should not depend on vertical scroll position. Keep horizontal geometry in document space.
      const sourceViewportLeftAtStart = mediaDocLeft;
      const sourceViewportTopAtStart = mediaDocTop - pinTrigger.start;

      const dockViewportLeftAtDock = dockDocLeft;
      const dockViewportTopAtDock = dockDocTop - dockScrollY;
      const secondaryDockViewportLeftAtDock = secondaryDockDocLeft;
      const secondaryDockViewportTopAtDock = secondaryDockDocTop - secondaryDockScrollY;

      const dx = lockX ? 0 : dockViewportLeftAtDock - sourceViewportLeftAtStart;
      const dy = dockViewportTopAtDock - sourceViewportTopAtStart + dockOffsetY;
      const secondaryDx = lockX
        ? 0
        : secondaryDockViewportLeftAtDock - sourceViewportLeftAtStart;
      const secondaryDy = secondaryDockViewportTopAtDock - sourceViewportTopAtStart + dockOffsetY;

      // Scale target should match dock target width (e.g. the red anchor placeholder).
      const w = mediaRect.width || 1;
      const dockScale = Math.max(0.25, Math.min(dockRect.width / w, 3));
      const secondaryDockScale = secondaryDockRect
        ? Math.max(0.25, Math.min(secondaryDockRect.width / w, 3))
        : dockScale;

      const pinRange = Math.max(1, pinTrigger.end - pinTrigger.start);
      const dockProgressRaw = (dockScrollY - pinTrigger.start) / pinRange;
      const dockProgress = Math.max(0.22, Math.min(0.88, dockProgressRaw));
      const secondaryDockProgressRaw = (secondaryDockScrollY - pinTrigger.start) / pinRange;
      const secondaryDockProgress = Math.max(0.30, Math.min(0.95, secondaryDockProgressRaw));

      return { dx, dy, dockScale, dockProgress, secondaryDx, secondaryDy, secondaryDockScale, secondaryDockProgress };
    };

    const apply = (pinSt: ScrollTrigger) => {
      const {
        dx,
        dy,
        dockScale,
        dockProgress,
        secondaryDx,
        secondaryDy,
        secondaryDockScale,
        secondaryDockProgress,
      } = compute(pinSt);
      const hold = Math.max(0, Math.min(0.8, holdBefore));
      const moveStart = Math.min(0.9, hold);
      const firstDockProgress = Math.min(0.85, Math.max(moveStart + 0.05, dockProgress));
      const finalDockProgress = secondaryDockTarget
        ? Math.min(0.95, Math.max(firstDockProgress + 0.08, secondaryDockProgress))
        : firstDockProgress;

      tl.clear()
        .fromTo(
          media,
          { x: 0, y: 0, scale: startScale, transformOrigin: "top left", willChange: "transform" },
          { x: 0, y: 0, scale: startScale, duration: moveStart },
          0,
        )
        .to(
          media,
          { x: dx, y: dy, scale: dockScale, duration: firstDockProgress - moveStart },
          moveStart,
        )
        .to(
          media,
          {
            x: secondaryDockTarget ? secondaryDx : dx,
            y: secondaryDockTarget ? secondaryDy : dy,
            scale: secondaryDockTarget ? secondaryDockScale : dockScale,
            duration: finalDockProgress - firstDockProgress,
          },
          firstDockProgress,
        )
        // Hold the final docked position while the pinned section continues.
        .to(
          media,
          {
            x: secondaryDockTarget ? secondaryDx : dx,
            y: secondaryDockTarget ? secondaryDy : dy,
            scale: secondaryDockTarget ? secondaryDockScale : dockScale,
            duration: 1 - finalDockProgress,
          },
          finalDockProgress,
        );
    };

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: wrap,
        start,
        endTrigger: pinUntil,
        end: "bottom bottom",
        scrub: true,
        pin: wrap,
        invalidateOnRefresh: true,
        onRefreshInit: () => {
          // Reset to a known baseline for measurement.
          gsap.set(media, { x: 0, y: 0, scale: startScale, transformOrigin: "top left" });
        },
        onRefresh: (self) => apply(self),
      },
    });

    const pinSt = tl.scrollTrigger!;
    apply(pinSt);

    return () => {
      dockPosTrigger?.kill();
      dockPosTrigger = null;
      secondaryDockPosTrigger?.kill();
      secondaryDockPosTrigger = null;
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [
    dockAt,
    dockTargetSelector,
    holdBefore,
    id,
    lockX,
    pinUntilSelector,
    secondaryDockAt,
    secondaryDockTargetSelector,
    start,
    startScale,
    dockOffsetY,
  ]);

  return (
    <div data-gs-sgdp={id} style={{ display: "flex", justifyContent: "center" }}>
      <div data-gs-sgdp-media style={{ display: "inline-block" }}>
        {children}
      </div>
    </div>
  );
}

