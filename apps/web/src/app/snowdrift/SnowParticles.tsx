"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  phase: number;
  opacity: number;
};

/**
 * Very slow 1-pixel snowfall — each particle is a single device pixel.
 * - Uses requestAnimationFrame for smooth motion; re-seeds on viewport
 *   resize.
 * - Scales the canvas backing store to devicePixelRatio so a 1-unit
 *   fillRect prints as one physical pixel rather than a blurred 2×2
 *   block on HiDPI displays.
 * - Pauses animation under `prefers-reduced-motion: reduce` but still
 *   paints a static field so the visual density is preserved.
 * - Pauses the RAF loop when the tab is hidden or the canvas scrolls
 *   off screen to stop burning cycles in the background.
 */
export default function SnowParticles({
  className,
  contained = false,
}: {
  className?: string;
  /** Size to the parent element (a positioned container) instead of the
   *  viewport — lets the snowfall live inside a scoped section/card. */
  contained?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const particles: Particle[] = [];
    // ~140 flakes across a 1080p viewport reads as "gentle" rather than
    // a blizzard; densify on taller/wider screens so the field stays
    // visually balanced.
    const densityPerMpx = 70;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      if (contained && parent) {
        width = parent.clientWidth || window.innerWidth;
        height = parent.clientHeight || window.innerHeight;
      } else {
        width = window.innerWidth;
        height = window.innerHeight;
      }
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles.length = 0;
      const area = (width * height) / 1_000_000; // megapixels
      const count = Math.max(60, Math.round(area * densityPerMpx));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: rand(0, width),
          y: rand(0, height),
          // Downward drift speed in px/frame — 0.08–0.28 at 60fps is
          // ~5–17 px/sec, deliberately slower than natural snow so the
          // motion reads as "ambient" rather than active.
          vy: rand(0.08, 0.28),
          // Tiny baseline horizontal drift; the sin-wobble below adds
          // the gentle sway on top of this.
          vx: rand(-0.04, 0.04),
          phase: rand(0, Math.PI * 2),
          opacity: rand(0.35, 0.9),
        });
      }
    };

    resize();
    seed();

    let raf = 0;
    let running = true;

    const step = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        if (!prefersReduced) {
          p.phase += 0.005;
          p.x += p.vx + Math.sin(p.phase) * 0.08;
          p.y += p.vy;
          if (p.y > height + 1) {
            p.y = -1;
            p.x = rand(0, width);
          }
          if (p.x < -1) p.x = width;
          else if (p.x > width + 1) p.x = -1;
        }
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
      }
      if (running) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onResize = () => {
      resize();
      seed();
    };
    const onVisibility = () => {
      const shouldRun = document.visibilityState === "visible";
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(step);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    // In contained mode, re-fit when the parent element resizes.
    let ro: ResizeObserver | undefined;
    const parentEl = canvas.parentElement;
    if (contained && parentEl && "ResizeObserver" in window) {
      ro = new ResizeObserver(onResize);
      ro.observe(parentEl);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      ro?.disconnect();
    };
  }, [contained]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
