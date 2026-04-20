"use client";

import { useEffect, useRef } from "react";

/**
 * Tiny pollen drifting over the hero video. Each particle has a pseudo
 * depth (0 = far, 1 = near) that scales its radius and speed, producing
 * a subtle parallax-within-parallax: combined with the video tilt, the
 * whole thing reads as a 3D object floating behind the headline.
 */
export default function HeroPollen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Reduced motion — draw a static dusting and exit.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    };

    const COUNT = 95;
    const particles: Particle[] = [];

    const spawn = (p: Partial<Particle> = {}): Particle => {
      const z = 0.2 + Math.random() * 0.8; // depth — far to near
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.07 + Math.random() * 0.22) * (0.5 + z);
      return {
        x: p.x ?? Math.random() * width,
        y: p.y ?? Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 0.5 + z * 1.6,
        alpha: 0.12 + z * 0.30,
      };
    };

    for (let i = 0; i < COUNT; i++) particles.push(spawn());

    const FADE_BAND = 60; // px — distance from edge where pollen fades

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        // Edge fade: alpha tapers as particle approaches any edge of the
        // canvas, so pollen softly dissolves at the rim instead of
        // hard-clipping.
        const d = Math.min(p.x, width - p.x, p.y, height - p.y);
        const edge = Math.max(0, Math.min(1, d / FADE_BAND));
        const a = p.alpha * edge;
        if (a <= 0) continue;

        // Soft glow halo.
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(246, 239, 201, ${(a * 0.18).toFixed(3)})`;
        ctx.fill();

        // Core grain.
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(246, 239, 201, ${a.toFixed(3)})`;
        ctx.fill();
      }
    };

    if (prefersReducedMotion) {
      drawFrame();
      return () => {
        ro.disconnect();
      };
    }

    let rafId = 0;
    const tick = () => {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Respawn when a particle drifts off-canvas so the dusting
        // remains visually even across the container.
        if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
          Object.assign(p, spawn({ x: Math.random() * width, y: Math.random() * height }));
        }
      }
      drawFrame();
      rafId = requestAnimationFrame(tick);
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
      }}
    />
  );
}
