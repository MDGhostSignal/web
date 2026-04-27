"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Drifting fireflies that gather loosely around the cursor inside the
 * hero. Each firefly has its own slow blink phase, so the cluster
 * twinkles independently rather than pulsing in unison. Drawn as soft
 * radial-gradient orbs with a brighter core — no body detail, since at
 * dusk distance only the light reads.
 *
 * Gated off on coarse pointers and under prefers-reduced-motion.
 */
export default function HeroFireflies({
  sectionRef,
}: {
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion || isCoarse) return;

    const section = sectionRef.current;
    if (!section) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    type Firefly = {
      x: number;
      y: number;
      // Loose orbit around the cursor
      baseRadius: number;
      angleOffset: number;
      angleSpeed: number;
      // Gentle wandering jitter
      jitterPhaseX: number;
      jitterPhaseY: number;
      jitterRateX: number;
      jitterRateY: number;
      // Drift: fireflies have lots of lag — they don't track tightly
      followRate: number;
      // Blink — slow brightness pulse, each firefly on its own clock
      blinkPhase: number;
      blinkRate: number;
      // Per-firefly size scale so the cluster doesn't read as uniform
      sizeScale: number;
    };

    const COUNT = 9;
    const fireflies: Firefly[] = Array.from({ length: COUNT }, (_, i) => ({
      x: 0,
      y: 0,
      // Wide, varied orbit so the cluster reads as ambient glow rather
      // than a tight swarm. Larger than the bee equivalent.
      baseRadius: 28 + i * 14, // 28, 42, 56, ... up to ~140
      angleOffset: (i / COUNT) * Math.PI * 2 + Math.random() * 0.6,
      angleSpeed: 0.35 + Math.random() * 0.55, // slow circling
      jitterPhaseX: Math.random() * Math.PI * 2,
      jitterPhaseY: Math.random() * Math.PI * 2,
      jitterRateX: 0.9 + Math.random() * 0.7,
      jitterRateY: 0.8 + Math.random() * 0.7,
      followRate: 0.018 + Math.random() * 0.025, // heavy drift
      blinkPhase: Math.random() * Math.PI * 2,
      blinkRate: 1.2 + Math.random() * 1.4, // ~0.2–0.4 Hz pulse
      sizeScale: 0.75 + Math.random() * 0.7,
    }));

    let mouseX = -9999;
    let mouseY = -9999;
    let mouseInWindow = false;
    let cursorInHero = false;

    const updateInHero = () => {
      if (!mouseInWindow) {
        cursorInHero = false;
        return;
      }
      const rect = section.getBoundingClientRect();
      cursorInHero =
        mouseY >= rect.top &&
        mouseY <= rect.bottom &&
        mouseX >= rect.left &&
        mouseX <= rect.right;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseInWindow = true;
      updateInHero();
    };
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        mouseInWindow = false;
        cursorInHero = false;
      }
    };
    const onScroll = () => updateInHero();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });

    let visibility = 0;

    let last = performance.now();
    let tSec = 0;
    let rafId = 0;

    const drawFirefly = (f: Firefly, t: number, alpha: number) => {
      // Brightness throb — never fully extinguishes (min 0.25). The
      // sine on its own clock produces a slow, irregular twinkle when
      // many fireflies are seen together.
      const blink = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * f.blinkRate + f.blinkPhase));
      const a = alpha * blink;
      if (a <= 0.01) return;

      const haloR = 13 * f.sizeScale;
      // Outer warm-amber glow — radial gradient drops to fully
      // transparent at the rim so multiple halos blend cleanly.
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, haloR);
      grad.addColorStop(0, `rgba(255, 226, 132, ${(a * 0.85).toFixed(3)})`);
      grad.addColorStop(0.35, `rgba(255, 198, 92, ${(a * 0.32).toFixed(3)})`);
      grad.addColorStop(1, "rgba(255, 198, 92, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Bright core — near-white so the firefly reads as luminous
      // rather than just colored.
      const coreR = 1.2 * f.sizeScale;
      ctx.fillStyle = `rgba(255, 248, 210, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, coreR, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tSec += dt;

      const rect = canvas.getBoundingClientRect();
      const cursorX = mouseX - rect.left;
      const cursorY = mouseY - rect.top;

      const target = cursorInHero ? 1 : 0;
      visibility += (target - visibility) * 0.05;

      ctx.clearRect(0, 0, width, height);

      if (visibility < 0.01) return;

      // Fireflies are emissive — additive blending makes overlapping
      // halos read as concentrated light rather than darkening one
      // another (which the default 'source-over' does at low alpha).
      ctx.globalCompositeOperation = "lighter";

      for (const f of fireflies) {
        const a = f.angleOffset + tSec * f.angleSpeed;
        const orbitX = Math.cos(a) * f.baseRadius;
        const orbitY = Math.sin(a) * f.baseRadius * 0.78;

        const jitterX = Math.sin(tSec * f.jitterRateX + f.jitterPhaseX) * 8;
        const jitterY = Math.cos(tSec * f.jitterRateY + f.jitterPhaseY) * 7;

        const targetX = cursorX + orbitX + jitterX;
        const targetY = cursorY + orbitY + jitterY;

        f.x += (targetX - f.x) * f.followRate;
        f.y += (targetY - f.y) * f.followRate;

        drawFirefly(f, tSec, visibility);
      }

      ctx.globalCompositeOperation = "source-over";
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [sectionRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 4,
      }}
    />
  );
}
