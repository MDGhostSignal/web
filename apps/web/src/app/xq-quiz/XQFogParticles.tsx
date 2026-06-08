"use client";

import { useEffect, useRef } from "react";

/**
 * XQFogParticles — Canvas2D particle overlay layered on top of the
 * WebGL fluid fog. Each particle is a soft radial gradient blob
 * (the "marshmallow mist droplet" reading you get on grok.com).
 * Particles spawn at the top-right and bottom-right corners, drift
 * diagonally with gravity + curl-noise jitter, fade in/out over
 * their lifetime, and grow slightly as they age.
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
  // Single right-center emitter — particles drift leftward at a
  // crawl. Initial speed dropped to ~40% of previous so the fog
  // accumulates as it crosses the screen.
  const angle = Math.PI + (Math.random() - 0.5) * 0.7;
  const speed = 0.12 + Math.random() * 0.28;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed * 0.3,
    size: 24 + Math.random() * 56,
    life: 0,
    // Even longer lifetime so slow particles still cross the page
    maxLife: 700 + Math.random() * 400,
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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const spawn = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Single right-center emitter — origin around 88% across,
      // vertically centered with ±18% spread. High spawn rate
      // (~0.85) gives a continuous stream rather than scattered
      // wisps.
      if (Math.random() < 0.85) {
        particles.push(
          makeParticle(
            W * (0.84 + Math.random() * 0.10),
            H * (0.42 + Math.random() * 0.18),
          ),
        );
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

      // Constant leftward push, halved so the fog drifts at a crawl.
      p.vx -= 0.006;

      // Mild gravity, halved
      p.vy += 0.003;

      // Air damping
      p.vx *= 0.99;
      p.vy *= 0.99;

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
      const opacity = fade * 0.35;
      if (opacity < 0.005) return;

      // Two color modes per particle: cool blue and warm magenta,
      // chosen by hueShift. Matches the right-side cinematic tint.
      const cool = p.hueShift < 0.5;
      const inner = cool
        ? `rgba(160, 180, 240, ${opacity * 0.65})`
        : `rgba(200, 150, 230, ${opacity * 0.65})`;
      const mid = cool
        ? `rgba(120, 140, 210, ${opacity * 0.28})`
        : `rgba(170, 110, 200, ${opacity * 0.28})`;
      const outer = `rgba(60, 50, 110, 0)`;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, inner);
      grad.addColorStop(0.5, mid);
      grad.addColorStop(1, outer);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
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

      raf = window.requestAnimationFrame(frame);
    };

    frame();

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
