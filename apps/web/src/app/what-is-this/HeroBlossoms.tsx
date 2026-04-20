"use client";

import { useEffect, useRef } from "react";

/**
 * Slow-falling cherry-blossom particles overlaid on the hero. Extends
 * the video's falling-blossom look past the video's bounds so the
 * effect spills onto the text/overlay area for a 3D read.
 *
 * Pure canvas, radial-gradient fills (no canvas filter / blur, which
 * is expensive) — cheap enough to run on mobile at 30 fps.
 */
export default function HeroBlossoms() {
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

    const dpr = Math.min(window.devicePixelRatio || 1, isCoarse ? 1 : 1.5);
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

    type Blossom = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      rot: number;
      vr: number;
      hue: number;
    };

    const COUNT = isCoarse ? 14 : 32;
    const blossoms: Blossom[] = [];

    const spawn = (initial = false): Blossom => {
      const z = 0.25 + Math.random() * 0.75; // depth: 0 far, 1 near
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : -20,
        vx: (-0.22 + Math.random() * 0.44) * (0.6 + z),
        vy: (0.22 + Math.random() * 0.55) * (0.6 + z),
        r: 4.1 + z * 9.6,
        alpha: 0.18 + z * 0.35,
        rot: Math.random() * Math.PI * 2,
        vr: -0.01 + Math.random() * 0.02,
        hue: 335 + Math.random() * 30, // soft pink → peach range
      };
    };

    for (let i = 0; i < COUNT; i++) blossoms.push(spawn(true));

    const FADE_BAND = 90; // px — blossoms fade at canvas edges

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const b of blossoms) {
        const edgeDist = Math.min(b.x + 60, width - b.x + 60, height - b.y + 60);
        const edge = Math.max(0, Math.min(1, edgeDist / FADE_BAND));
        const a = b.alpha * edge;
        if (a <= 0) continue;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);

        // Soft radial gradient — gives the "blurry petal" look without
        // pulling the ctx.filter: blur() hammer (which tanks perf).
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.r);
        grad.addColorStop(0, `hsla(${b.hue}, 90%, 85%, ${a})`);
        grad.addColorStop(0.45, `hsla(${b.hue - 12}, 80%, 78%, ${a * 0.5})`);
        grad.addColorStop(1, `hsla(${b.hue - 22}, 70%, 72%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();

        // Slight elongated bright centre so it hints at a petal rather
        // than being a perfect circle.
        ctx.fillStyle = `hsla(${b.hue + 5}, 95%, 90%, ${a * 0.55})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.r * 0.38, b.r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    };

    if (prefersReducedMotion) {
      drawFrame();
      return () => ro.disconnect();
    }

    let last = performance.now();
    const targetFps = isCoarse ? 30 : 60;
    const frameInterval = 1000 / targetFps;
    let acc = 0;
    let rafId = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const delta = now - last;
      last = now;
      acc += delta;
      if (acc < frameInterval) return;
      acc -= frameInterval;

      for (const b of blossoms) {
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        if (b.y > height + 30 || b.x < -40 || b.x > width + 40) {
          Object.assign(b, spawn(false));
        }
      }
      drawFrame();
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

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
        zIndex: 3,
      }}
    />
  );
}
