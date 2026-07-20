"use client";

import { useEffect, useRef } from "react";

/**
 * XQFogParticles — Canvas2D particle overlay layered on top of the
 * WebGL fluid fog. Each particle is a soft radial gradient blob
 * (the "marshmallow mist droplet" reading you get on grok.com).
 * Particles spawn from a horizontal oval at top-center (matching
 * the WebGL shader emitter), drift downward with curl-noise jitter
 * + gravity, fade in/out over their lifetime, and grow slightly
 * as they age.
 *
 * Sits between the fluid-fog WebGL canvas and the wordmark in the
 * stacking order so the wisps drift across the X/Q silhouette.
 */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hueShift: number;
};

function makeParticle(x: number, y: number): Particle {
  // Top-center oval emitter — particles drift downward at a crawl,
  // spilling across the X/Q wordmark. Angle aimed roughly downward
  // (Math.PI / 2) with a wide spread so the spill fans out.
  const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.1;
  const speed = 0.12 + Math.random() * 0.28;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed * 0.4,
    vy: Math.sin(angle) * speed,
    size: 24 + Math.random() * 56,
    life: 0,
    // Long lifetime so the spill reaches all the way down to just
    // above the Begin CTA before fading out. Tuned together with
    // the gravity above for ~12s viewport traversal.
    maxLife: 2400 + Math.random() * 1000,
    hueShift: Math.random(),
  };
}

export default function XQFogParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1× regardless of devicePixelRatio — the particles are soft
    // radial blobs, so retina resolution bought nothing but fill cost.
    const dpr = 1;
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    let raf = 0;

    // Pre-rendered gradient sprites (one per tint variant), drawn per
    // particle via drawImage + globalAlpha. The previous code built a
    // fresh createRadialGradient for every particle every frame
    // (~14k gradient allocations/sec at the 240-particle cap) which
    // showed up as constant main-thread churn.
    const SPRITE_SIZE = 128;
    const makeSprite = (inner: string, mid: string) => {
      const sprite = document.createElement("canvas");
      sprite.width = SPRITE_SIZE;
      sprite.height = SPRITE_SIZE;
      const sctx = sprite.getContext("2d");
      if (!sctx) return sprite;
      const half = SPRITE_SIZE / 2;
      const grad = sctx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, inner);
      grad.addColorStop(0.5, mid);
      grad.addColorStop(1, "rgba(40, 80, 110, 0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      return sprite;
    };
    // Same stops as the old per-frame gradients, with the fade*0.22
    // opacity term moved out to globalAlpha at draw time.
    const spriteWarm = makeSprite(
      "rgba(150, 210, 230, 0.65)",
      "rgba(110, 170, 200, 0.28)",
    );
    const spriteCool = makeSprite(
      "rgba(140, 190, 240, 0.65)",
      "rgba(100, 150, 210, 0.28)",
    );

    const spawn = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Top-center oval emitter — 2/3 of viewport width, 1/6 of
      // viewport height, anchored at uv (0.5, 0.86) which sits
      // behind the X/Q wordmark. Sampling: uniform x across the
      // oval's width, narrow Gaussian-ish y so most particles
      // spawn near the oval's vertical centerline.
      if (Math.random() < 0.85) {
        const halfW = (W * 2) / 5; // 4/5 wide → halfW = 2W/5
        const halfH = H / 12;      // 1/6 tall → halfH = H/12
        const cx = W * 0.5;
        const cy = H * (1 - 0.86); // uv y=0.86 in shader is top-leaning; DOM uses top-down
        const dx = (Math.random() - 0.5) * 2 * halfW;
        const dy = (Math.random() - 0.5) * 2 * halfH * 0.7;
        particles.push(makeParticle(cx + dx, cy + dy));
      }

      // Cap the population so the canvas stays performant
      if (particles.length > 240) particles.splice(0, particles.length - 240);
    };

    const update = (p: Particle) => {
      p.life++;
      const t = p.life / p.maxLife;

      // Curl-noise jitter — small directional perturbation that
      // varies across the particle's lifetime so the path feels
      // organic, not linear.
      const jitter = 0.04;
      p.vx += (Math.random() - 0.5) * jitter;
      p.vy += (Math.random() - 0.5) * jitter;

      // Mild gravity — the constant pull that carries the spill
      // downward across the wordmark. Tuned for ~12s viewport
      // traversal to match the shader fog's slower drift.
      p.vy += 0.0018;

      // Air damping — slightly looser so particles retain momentum
      // and reach the bottom of the page before their life ends.
      p.vx *= 0.992;
      p.vy *= 0.992;

      p.x += p.vx;
      p.y += p.vy;

      // Grow slowly so older particles read as more diffuse
      p.size *= 1.0035;

      // Fade in for 15%, hold, fade out for 35%
      const fadeIn = Math.min(1, t / 0.15);
      const fadeOut = Math.max(0, 1 - (t - 0.65) / 0.35);
      return Math.min(fadeIn, fadeOut);
    };

    const draw = (p: Particle, fade: number) => {
      const opacity = fade * 0.22;
      if (opacity < 0.005) return;

      // Tint variance via two pre-baked sprites — both in the cool
      // blue-cyan range to match the shader fog palette.
      const sprite = p.hueShift > 0.5 ? spriteWarm : spriteCool;
      ctx.globalAlpha = opacity;
      ctx.drawImage(
        sprite,
        p.x - p.size,
        p.y - p.size,
        p.size * 2,
        p.size * 2,
      );
    };

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";

      spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const fade = update(p);
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        draw(p, fade);
      }
      ctx.globalAlpha = 1;

      raf = window.requestAnimationFrame(frame);
    };

    // Reduced motion: no drifting particles — the WebGL fog already
    // renders a static ground in that mode.
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame();
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
