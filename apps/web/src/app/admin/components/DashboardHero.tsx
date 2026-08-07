"use client";

import { useEffect, useRef } from "react";

import styles from "./DashboardHero.module.css";

/**
 * Motivational banner atop the admin dashboard — a Renaissance-inspired
 * gilded fresco. A deep warm ground lit by "divine light", drifting gold
 * dust motes (like gilding catching candlelight in a chapel), the
 * GHOSTSignal cloud brandmark, a co-founder line rendered in gilded
 * serif, and a gold morse strip transmitting the same phrase. The theme
 * is admiration of beauty and craft — "You are making the World." as an
 * echo of the Creation.
 *
 * The gold dust is a hand-rolled canvas effect (no libs): soft motes
 * drifting upward with a gentle twinkle. Respects prefers-reduced-motion
 * (renders one still scatter), scales for DPR, and re-fits on resize.
 */

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
};
const PHRASE = "YOU ARE MAKING THE WORLD";

type Sym = { kind: "dot" | "dash" } | { kind: "letter-gap" } | { kind: "word-gap" };
function buildSequence(phrase: string): Sym[] {
  const out: Sym[] = [];
  const words = phrase.toUpperCase().split(" ");
  words.forEach((word, wi) => {
    [...word].forEach((ch, ci) => {
      const code = MORSE[ch];
      if (!code) return;
      for (const s of code) out.push({ kind: s === "." ? "dot" : "dash" });
      if (ci < word.length - 1) out.push({ kind: "letter-gap" });
    });
    if (wi < words.length - 1) out.push({ kind: "word-gap" });
  });
  return out;
}
const SEQUENCE = buildSequence(PHRASE);

/* --------------------------- gold dust ----------------------------- */

type Mote = {
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  r: number; // radius px
  speed: number; // upward, per second (fraction of height)
  drift: number; // horizontal sway amplitude (fraction of width)
  phase: number;
  alpha: number;
};

function seedMotes(count: number): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      speed: 0.008 + Math.random() * 0.022,
      drift: 0.004 + Math.random() * 0.014,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.25 + Math.random() * 0.6,
    });
  }
  return motes;
}

function drawDust(
  ctx: CanvasRenderingContext2D,
  motes: Mote[],
  w: number,
  h: number,
  time: number,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter"; // additive glow
  for (const m of motes) {
    const px = (m.x + Math.sin(time * 0.5 + m.phase) * m.drift) * w;
    const py = m.y * h;
    const twinkle = 0.55 + 0.45 * Math.sin(time * 1.6 + m.phase);
    const a = m.alpha * twinkle;
    const rad = m.r * 4;
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, `rgba(255, 226, 150, ${a})`);
    g.addColorStop(0.4, `rgba(226, 178, 92, ${a * 0.5})`);
    g.addColorStop(1, "rgba(200, 150, 70, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ------------------------------ view ------------------------------- */

export function DashboardHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const motes = seedMotes(64);

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) drawDust(ctx, motes, w, h, 0.6);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    if (!reduce) {
      const start = performance.now();
      let last = start;
      const loop = (now: number) => {
        const t = (now - start) / 1000;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        // advance motes (upward, wrap to bottom)
        for (const m of motes) {
          m.y -= m.speed * dt;
          if (m.y < -0.05) {
            m.y = 1.05;
            m.x = Math.random();
          }
        }
        drawDust(ctx, motes, w, h, t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <section className={styles.hero} aria-label="You are making the World">
      <div className={styles.rays} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.dust} aria-hidden="true" />
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.content}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/brandmark-vert-white.svg"
          alt="GHOSTSignal"
          className={styles.logo}
        />
        <p className={styles.quote}>You are making the World.</p>
        <div className={styles.morse} aria-hidden="true">
          {SEQUENCE.map((s, i) => {
            if (s.kind === "word-gap")
              return <span key={i} className={styles.wordGap} />;
            if (s.kind === "letter-gap")
              return <span key={i} className={styles.letterGap} />;
            return (
              <span
                key={i}
                className={s.kind === "dot" ? styles.dot : styles.dash}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
