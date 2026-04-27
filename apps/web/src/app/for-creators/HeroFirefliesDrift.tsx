"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient firefly drift across the for-creators hero. Same drift +
 * cursor-repulsion mechanics as the dandelion-seed version this
 * component replaces, and as HeroPollen (/for-advertisers) and
 * HeroBlossoms (/what-is-this): each firefly stores its baseline
 * upward drift at spawn, the cursor applies a radial impulse with
 * linear falloff inside a 140 px radius, and a spring-damp term pulls
 * velocity back to baseline so pushed fireflies smoothly rejoin the
 * natural float.
 *
 * Drawn as a soft warm-amber radial-gradient halo + bright cream core
 * with an independent slow blink phase, so the drift twinkles instead
 * of glowing in unison.
 *
 * Gated off on coarse pointers and under prefers-reduced-motion.
 */
export default function HeroFirefliesDrift() {
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

    // DPR capped at 1: each firefly is a soft radial gradient, so the
    // higher sampling density of 2x DPR isn't visually meaningful — but
    // it doubled the per-frame fill cost over a viewport-sized canvas
    // that runs every animation frame, which competed with the hero
    // video decode. Same mitigation applied to /for-advertisers pollen.
    const dpr = 1;
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
      vx: number;
      vy: number;
      // Baseline drift — what vx/vy relax back to after a cursor
      // push. Fireflies drift roughly upward + gentle sideways,
      // matching the seed pattern.
      vx0: number;
      vy0: number;
      r: number;
      alpha: number;
      // Per-firefly blink — slow brightness pulse, so the cluster
      // twinkles independently rather than glowing in unison.
      blinkPhase: number;
      blinkRate: number;
    };

    // Trimmed from 52 → 36 alongside the DPR cap above. The cluster
    // still reads as continuous twinkle; per-frame draw work drops by
    // about a third, freeing budget for the hero video decode.
    const COUNT = isCoarse ? 20 : 36;
    const fireflies: Firefly[] = [];

    const spawn = (initial = false): Firefly => {
      const z = 0.3 + Math.random() * 0.7; // depth: 0 far, 1 near
      const vx = (-0.09 + Math.random() * 0.18) * (0.6 + z);
      // Negative vy = upward drift. Fireflies rise off the meadow.
      const vy = (-0.18 - Math.random() * 0.16) * (0.6 + z);
      // Fireflies live in the bottom half of the hero — that's where
      // the meadow in the video sits, so they read as rising off the
      // grass at dusk. Fresh respawns enter from just below the hero;
      // initial spread covers just the lower half.
      const halfH = height * 0.5;
      return {
        x: Math.random() * width,
        y: initial ? halfH + Math.random() * halfH : height + 20,
        vx,
        vy,
        vx0: vx,
        vy0: vy,
        // Halo radius scaled with depth so near fireflies read
        // brighter / nearer-camera than far ones.
        r: 5 + z * 7,
        alpha: 0.45 + z * 0.4,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkRate: 1.0 + Math.random() * 1.2, // ~0.16–0.35 Hz
      };
    };

    for (let i = 0; i < COUNT; i++) fireflies.push(spawn(true));

    const FADE_BAND = 80;
    let tSec = 0;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      // Additive compositing so overlapping halos concentrate light
      // (firefly read) rather than darkening one another.
      ctx.globalCompositeOperation = "lighter";
      for (const f of fireflies) {
        const edgeDist = Math.min(
          f.x + 40,
          width - f.x + 40,
          f.y + 40,
          height - f.y + 40,
        );
        const edge = Math.max(0, Math.min(1, edgeDist / FADE_BAND));
        // Subtle blink — fireflies never fully extinguish (floor 0.55),
        // so the drift stays continuous rather than flickering. Range
        // is gentler than the cursor-attached swarm so this layer
        // reads as ambient atmosphere.
        const blink =
          0.55 + 0.45 * (0.5 + 0.5 * Math.sin(tSec * f.blinkRate + f.blinkPhase));
        const a = f.alpha * edge * blink;
        if (a <= 0.01) continue;

        // Outer warm-amber halo.
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        grad.addColorStop(0, `rgba(255, 226, 132, ${(a * 0.85).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(255, 198, 92, ${(a * 0.32).toFixed(3)})`);
        grad.addColorStop(1, "rgba(255, 198, 92, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();

        // Bright cream core — luminous read.
        const coreR = Math.max(0.8, f.r * 0.12);
        ctx.fillStyle = `rgba(255, 248, 210, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, coreR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    if (prefersReducedMotion) {
      drawFrame();
      return () => ro.disconnect();
    }

    // Cursor repulsion — same mechanics as HeroBlossoms / HeroPollen
    // and the seed version this replaces.
    const REPEL_RADIUS = 140;
    const REPEL_STRENGTH = 0.8;
    const DAMP_TO_BASELINE = 0.025;
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
      tSec += frameInterval / 1000;

      const radiusSq = REPEL_RADIUS * REPEL_RADIUS;
      const ceiling = height * 0.5; // fireflies live below this line
      for (const f of fireflies) {
        const dx = f.x - mouseX;
        const dy = f.y - mouseY;
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const falloff = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const force = falloff * REPEL_STRENGTH;
          f.vx += (dx / dist) * force;
          f.vy += (dy / dist) * force;
        }

        // Spring-damp back to the firefly's baseline drift.
        f.vx += (f.vx0 - f.vx) * DAMP_TO_BASELINE;
        f.vy += (f.vy0 - f.vy) * DAMP_TO_BASELINE;

        f.x += f.vx;
        f.y += f.vy;

        // Respawn when fireflies rise past the midpoint or drift out
        // sideways / below. Keeps the drift confined to the lower
        // half where the video's meadow lives.
        if (
          f.y < ceiling - 20 ||
          f.y > height + 40 ||
          f.x < -40 ||
          f.x > width + 40
        ) {
          Object.assign(f, spawn(false));
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
