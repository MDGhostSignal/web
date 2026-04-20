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
      // Baseline drift — what vx/vy relax back to after a cursor push, so
      // pushed petals smoothly rejoin the natural fall instead of
      // permanently changing course.
      vx0: number;
      vy0: number;
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
      const vx = (-0.22 + Math.random() * 0.44) * (0.6 + z);
      const vy = (0.22 + Math.random() * 0.55) * (0.6 + z);
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : -20,
        vx,
        vy,
        vx0: vx,
        vy0: vy,
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

    // Cursor repulsion. Canvas is pointer-events: none, so mousemove
    // events never fire on it — listen on window and convert to canvas
    // coords via getBoundingClientRect. Gated on fine pointer (no touch
    // hover) and skipped under reduced motion.
    const REPEL_RADIUS = 130;     // px — influence zone around the cursor
    const REPEL_STRENGTH = 2.2;   // max impulse per frame at the cursor
    const DAMP_TO_BASELINE = 0.03; // how fast pushed petals rejoin drift
    let mouseX = -9999;
    let mouseY = -9999;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const clearMouse = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    if (!isCoarse) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseout", clearMouse);
      window.addEventListener("blur", clearMouse);
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

      const radiusSq = REPEL_RADIUS * REPEL_RADIUS;
      for (const b of blossoms) {
        // Repulsion impulse when the cursor is within REPEL_RADIUS.
        // Falloff is linear in distance so petals ease into motion
        // instead of snapping once they cross the boundary.
        const dx = b.x - mouseX;
        const dy = b.y - mouseY;
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const falloff = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const force = falloff * REPEL_STRENGTH;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
          // Nudge rotation so pushed petals tumble, not glide.
          b.vr += falloff * 0.002 * (dx >= 0 ? 1 : -1);
        }

        // Spring-damp velocity back to the petal's baseline drift so
        // the push decays smoothly rather than accumulating.
        b.vx += (b.vx0 - b.vx) * DAMP_TO_BASELINE;
        b.vy += (b.vy0 - b.vy) * DAMP_TO_BASELINE;

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
      if (!isCoarse) {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseout", clearMouse);
        window.removeEventListener("blur", clearMouse);
      }
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
