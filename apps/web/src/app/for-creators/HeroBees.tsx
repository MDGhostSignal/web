"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Small swarm of bees that chase the cursor inside the hero. Each
 * bee has its own orbital offset around the pointer plus a jitter
 * overlay, so the swarm darts and weaves instead of clumping. Bees
 * fade out when the cursor leaves the hero or the section scrolls
 * past; the swarm dissolves, it doesn't fly off to the corner.
 *
 * Drawn on a single canvas — cheaper than 4 separate DOM elements
 * and consistent with the other particle effects on neighbouring
 * pages. Gated off on coarse pointers and under prefers-reduced-motion.
 */
export default function HeroBees({
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

    type Bee = {
      x: number;
      y: number;
      // Orbital parameters around the cursor
      baseRadius: number;
      angleOffset: number;
      angleSpeed: number;
      // Independent jitter clocks so each bee darts differently
      jitterPhaseX: number;
      jitterPhaseY: number;
      jitterRateX: number;
      jitterRateY: number;
      // Hover bobble — high-freq y oscillation characteristic of
      // bees holding station in mid-air.
      bobPhase: number;
      bobRate: number;
      // Follow rate — smaller = more lag behind cursor
      followRate: number;
      // Wing flap phase
      wingPhase: number;
      // Last direction of travel, for body rotation
      heading: number;
    };

    const COUNT = 4;
    const bees: Bee[] = Array.from({ length: COUNT }, (_, i) => ({
      x: 0,
      y: 0,
      baseRadius: 16 + i * 7, // 16, 23, 30, 37
      angleOffset: (i / COUNT) * Math.PI * 2,
      angleSpeed: 2.6 + Math.random() * 1.6,
      jitterPhaseX: Math.random() * Math.PI * 2,
      jitterPhaseY: Math.random() * Math.PI * 2,
      jitterRateX: 8 + Math.random() * 5,
      jitterRateY: 9 + Math.random() * 5,
      bobPhase: Math.random() * Math.PI * 2,
      bobRate: 13 + Math.random() * 6,
      followRate: 0.24 + i * 0.03,
      wingPhase: Math.random() * Math.PI * 2,
      heading: 0,
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

    // Fade opacity — lerped toward shouldShow target so the swarm
    // dissolves rather than snapping.
    let visibility = 0;

    let last = performance.now();
    let tSec = 0;
    let rafId = 0;

    const drawBee = (b: Bee, t: number, alpha: number) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.heading);
      ctx.globalAlpha = alpha;

      // Wings are drawn BEFORE the body and extend perpendicular to
      // the heading axis (one above, one below), anchored at the
      // body centre-line. `flap` scales the wing's perpendicular
      // radius from ~0.12 (edge-on mid-flap) to 1 (fully spread) —
      // that full edge-on-to-spread sweep is what reads as flapping
      // rather than crawling. Cycle is ~5 Hz; a whitish translucent
      // fill + soft shadow gives the motion-blurred "haze of wings"
      // look. Wings swept slightly back (rotated ~-0.25 rad) so they
      // don't look like helicopter blades.
      const flap = 0.12 + 0.88 * Math.abs(Math.sin(t * 34 + b.wingPhase));
      const wingR = 3.6 * flap;

      ctx.fillStyle = "rgba(235, 242, 255, 0.55)";
      ctx.strokeStyle = "rgba(170, 190, 225, 0.7)";
      ctx.lineWidth = 0.22;
      ctx.shadowBlur = 3.5;
      ctx.shadowColor = "rgba(255, 255, 255, 0.65)";

      // Upper wing (-y side of body axis)
      ctx.beginPath();
      ctx.ellipse(-0.4, -wingR, 2.6, wingR, -0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lower wing (+y side)
      ctx.beginPath();
      ctx.ellipse(-0.4, wingR, 2.6, wingR, 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Abdomen + thorax: yellow oval with three dark vertical
      // stripes. The head (front of direction of travel, +x side)
      // is a small black knob.
      ctx.fillStyle = "#f5c316";
      ctx.beginPath();
      ctx.ellipse(-0.3, 0, 3.4, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a0f00";
      ctx.fillRect(-2.2, -1.9, 0.55, 3.8);
      ctx.fillRect(-0.7, -2.0, 0.55, 4.0);
      ctx.fillRect(0.8, -1.9, 0.55, 3.8);

      // Head
      ctx.fillStyle = "#0f0800";
      ctx.beginPath();
      ctx.ellipse(3.1, 0, 1.3, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tSec += dt;

      // Canvas origin relative to viewport — so we can convert
      // window-space mouse coords into canvas-local positions.
      const rect = canvas.getBoundingClientRect();
      const cursorX = mouseX - rect.left;
      const cursorY = mouseY - rect.top;

      // Opacity lerp
      const target = cursorInHero ? 1 : 0;
      visibility += (target - visibility) * 0.08;

      ctx.clearRect(0, 0, width, height);

      if (visibility < 0.01) return;

      for (const b of bees) {
        // Orbit around cursor
        const a = b.angleOffset + tSec * b.angleSpeed;
        const orbitX = Math.cos(a) * b.baseRadius;
        const orbitY = Math.sin(a) * b.baseRadius * 0.75;

        // Jitter — high-frequency darting so bees don't glide.
        const jitterX = Math.sin(tSec * b.jitterRateX + b.jitterPhaseX) * 5;
        const jitterY = Math.cos(tSec * b.jitterRateY + b.jitterPhaseY) * 4;

        // Hover bobble — fast vertical twitch at ~2 Hz. Real bees
        // holding station bob on their wingbeats; without this the
        // orbit path reads as a smooth glide (crawling) rather than
        // hovering flight.
        const bob = Math.sin(tSec * b.bobRate + b.bobPhase) * 1.8;

        const targetX = cursorX + orbitX + jitterX;
        const targetY = cursorY + orbitY + jitterY + bob;

        const prevX = b.x;
        const prevY = b.y;
        b.x += (targetX - b.x) * b.followRate;
        b.y += (targetY - b.y) * b.followRate;

        // Heading smoothly follows velocity so the bee's head faces
        // forward. Small epsilon avoids atan2 jumps when nearly still.
        const dx = b.x - prevX;
        const dy = b.y - prevY;
        if (dx * dx + dy * dy > 0.01) {
          const targetHeading = Math.atan2(dy, dx);
          // Shortest-arc interpolation — prevents a 2π snap when
          // heading wraps across ±π.
          let diff = targetHeading - b.heading;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          b.heading += diff * 0.25;
        }

        drawBee(b, tSec, visibility);
      }
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
        // Single GPU-compositor blur over the whole canvas softens
        // body outlines and smears the flapping wings into the
        // motion-blur read a flying bee has on camera — much more
        // than per-stroke shadowBlur alone can give.
        filter: "blur(0.55px)",
      }}
    />
  );
}
