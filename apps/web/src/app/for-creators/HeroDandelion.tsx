"use client";

import { useEffect, useRef } from "react";

/**
 * Dandelion-seed drift across the for-creators hero. Same repulsion
 * pattern used by HeroPollen (/for-advertisers) and HeroBlossoms
 * (/what-is-this): each seed stores its baseline drift at spawn, the
 * cursor applies a radial impulse with linear falloff inside a 140 px
 * radius, and a spring-damp term pulls velocity back to baseline so
 * pushed seeds smoothly rejoin the natural float.
 *
 * Each seed is drawn as a radial pappus (a halo of fine hairs), a
 * soft central fluff, and a tiny dark achene — recognisable as a
 * dandelion seed without needing anatomical detail.
 *
 * Gated off on coarse pointers and under prefers-reduced-motion.
 */
export default function HeroDandelion() {
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

    const dpr = Math.min(window.devicePixelRatio || 1, isCoarse ? 1 : 1.75);
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

    type Seed = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      // Baseline drift — what vx/vy relax back to after a cursor
      // push. Dandelions drift roughly upward + gentle sideways.
      vx0: number;
      vy0: number;
      r: number;
      rot: number;
      // Tumble: per-seed sinusoidal modulation of rotation speed so
      // each seed accelerates / decelerates / reverses on its own
      // cadence instead of spinning at a constant rate.
      tumbleRate: number;
      tumblePhase: number;
      tumbleAmp: number;
      // Tip: per-seed scaleX oscillation applied in draw, simulating
      // the pappus rocking between face-on and edge-on as it tumbles.
      tipRate: number;
      tipPhase: number;
      hairs: number;
      alpha: number;
    };

    const COUNT = isCoarse ? 26 : 52;
    const seeds: Seed[] = [];

    const spawn = (initial = false): Seed => {
      const z = 0.3 + Math.random() * 0.7; // depth: 0 far, 1 near
      const vx = (-0.09 + Math.random() * 0.18) * (0.6 + z);
      // Negative vy = upward drift. Dandelions rise on a gentle breeze.
      const vy = (-0.18 - Math.random() * 0.16) * (0.6 + z);
      // Seeds live in the bottom half of the hero — that's where the
      // meadow in the video sits, so floating seeds read as rising
      // off the flowers. Fresh respawns enter from just below the
      // hero; initial spread covers just the lower half.
      const halfH = height * 0.5;
      return {
        x: Math.random() * width,
        y: initial ? halfH + Math.random() * halfH : height + 20,
        vx,
        vy,
        vx0: vx,
        vy0: vy,
        r: 4 + z * 5.5,
        rot: Math.random() * Math.PI * 2,
        tumbleRate: 0.6 + Math.random() * 1.4,
        tumblePhase: Math.random() * Math.PI * 2,
        tumbleAmp: 0.012 + Math.random() * 0.015,
        tipRate: 0.4 + Math.random() * 1.1,
        tipPhase: Math.random() * Math.PI * 2,
        hairs: 14,
        alpha: 0.22 + z * 0.35,
      };
    };

    for (let i = 0; i < COUNT; i++) seeds.push(spawn(true));

    const FADE_BAND = 80;
    // Elapsed seconds — drives the per-seed tumble/tip oscillations.
    // Declared here so drawFrame (called on reduced-motion path too)
    // can read it without recomputation.
    let tSec = 0;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of seeds) {
        const edgeDist = Math.min(
          s.x + 40,
          width - s.x + 40,
          s.y + 40,
          height - s.y + 40,
        );
        const edge = Math.max(0, Math.min(1, edgeDist / FADE_BAND));
        const a = s.alpha * edge;
        if (a <= 0) continue;

        // Per-seed scaleX — oscillates between ~0.3 (near edge-on)
        // and 1 (face-on). Clamped floor keeps the seed from
        // completely vanishing at the transition.
        const scaleX = Math.max(
          0.3,
          Math.abs(Math.sin(tSec * s.tipRate + s.tipPhase)),
        );

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.scale(scaleX, 1);

        // Pappus halo — N radiating hairs. Low line-width gives the
        // wispy read without needing to draw dozens per seed.
        ctx.strokeStyle = `rgba(248, 244, 230, ${a.toFixed(3)})`;
        ctx.lineWidth = 0.45;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i < s.hairs; i++) {
          const angle = (i / s.hairs) * Math.PI * 2;
          const len = s.r * (0.85 + 0.15 * Math.sin(i * 2.3 + s.rot));
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        }
        ctx.stroke();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r * 0.55);
        grad.addColorStop(0, `rgba(255, 252, 242, ${(a * 0.55).toFixed(3)})`);
        grad.addColorStop(1, "rgba(248, 244, 230, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, s.r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(78, 60, 38, ${(a * 0.85).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.55, 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    };

    if (prefersReducedMotion) {
      drawFrame();
      return () => ro.disconnect();
    }

    // Cursor repulsion — same mechanics as HeroBlossoms / HeroPollen.
    // REPEL_STRENGTH is mid-range: dandelions are lighter than
    // blossoms so they respond more eagerly than petals, but heavier
    // than pollen so they don't shoot across the hero at a twitch.
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
      const ceiling = height * 0.5; // seeds live below this line
      for (const s of seeds) {
        const dx = s.x - mouseX;
        const dy = s.y - mouseY;
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const falloff = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          const force = falloff * REPEL_STRENGTH;
          s.vx += (dx / dist) * force;
          s.vy += (dy / dist) * force;
        }

        // Spring-damp back to the seed's baseline drift.
        s.vx += (s.vx0 - s.vx) * DAMP_TO_BASELINE;
        s.vy += (s.vy0 - s.vy) * DAMP_TO_BASELINE;

        // Per-seed tumble: rotation speed is a smooth sinusoidal
        // oscillation on the seed's own phase + rate, so each one
        // speeds up, slows, reverses independently.
        const vr =
          Math.sin(tSec * s.tumbleRate + s.tumblePhase) * s.tumbleAmp;

        s.x += s.vx;
        s.y += s.vy;
        s.rot += vr;

        // Respawn when seeds rise past the midpoint (they "leave the
        // meadow") or drift out sideways / below. Keeps the drift
        // confined to the lower half where the video's flowers live.
        if (
          s.y < ceiling - 20 ||
          s.y > height + 40 ||
          s.x < -40 ||
          s.x > width + 40
        ) {
          Object.assign(s, spawn(false));
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
        // Single GPU-compositor blur over the whole canvas — cheaper
        // than per-stroke shadowBlur and softens the hair edges into
        // the fluffy-pappus read real dandelions have.
        filter: "blur(0.7px)",
      }}
    />
  );
}
