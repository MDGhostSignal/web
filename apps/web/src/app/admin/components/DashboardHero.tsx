"use client";

import { useEffect, useRef } from "react";

import styles from "./DashboardHero.module.css";

/**
 * Motivational banner atop the admin dashboard — a neutral panel that
 * follows the admin theme (light greys in light mode, dark greys in
 * dark). Subtle drifting dust motes behind the GHOSTSignal brandmark,
 * the "You are making the World." line, and a morse strip transmitting
 * the same phrase. No accent coloring — grey tones only.
 *
 * The dust is a hand-rolled canvas effect (no libs): soft motes drifting
 * upward with a gentle twinkle. Mote colour is read from the
 * `--hero-mote-rgb` CSS variable so it flips with the theme. Respects
 * prefers-reduced-motion (still scatter), scales for DPR, re-fits on
 * resize.
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

/* --------------------------- dust motes ---------------------------- */

type Mote = {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
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
      alpha: 0.2 + Math.random() * 0.45,
    });
  }
  return motes;
}

function drawDust(
  ctx: CanvasRenderingContext2D,
  motes: Mote[],
  rgb: string,
  w: number,
  h: number,
  time: number,
) {
  ctx.clearRect(0, 0, w, h);
  for (const m of motes) {
    const px = (m.x + Math.sin(time * 0.5 + m.phase) * m.drift) * w;
    const py = m.y * h;
    const twinkle = 0.55 + 0.45 * Math.sin(time * 1.6 + m.phase);
    const a = m.alpha * twinkle;
    const rad = m.r * 4;
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
    // `rgb` is a space-separated triplet ("208 213 222"), so use the
    // modern slash-alpha syntax — rgba(r g b, a) is invalid.
    g.addColorStop(0, `rgb(${rgb} / ${a})`);
    g.addColorStop(0.5, `rgb(${rgb} / ${a * 0.35})`);
    g.addColorStop(1, `rgb(${rgb} / 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ------------------------------ view ------------------------------- */

export function DashboardHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const motes = seedMotes(60);

    // Mote colour follows the theme via a CSS variable; re-read when the
    // admin-root data-theme flips.
    let rgb = "180 186 198";
    const readColour = () => {
      const v = getComputedStyle(hero)
        .getPropertyValue("--hero-mote-rgb")
        .trim();
      if (v) rgb = v;
    };
    readColour();
    const themeRoot = hero.closest(".admin-root");
    const mo = themeRoot
      ? new MutationObserver(() => {
          readColour();
          if (reduce) drawDust(ctx, motes, rgb, w, h, 0.6);
        })
      : null;
    mo?.observe(themeRoot!, { attributes: true, attributeFilter: ["data-theme"] });

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) drawDust(ctx, motes, rgb, w, h, 0.6);
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
        for (const m of motes) {
          m.y -= m.speed * dt;
          if (m.y < -0.05) {
            m.y = 1.05;
            m.x = Math.random();
          }
        }
        drawDust(ctx, motes, rgb, w, h, t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo?.disconnect();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      aria-label="You are making the World"
    >
      <canvas ref={canvasRef} className={styles.dust} aria-hidden="true" />

      <div className={styles.content}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/brandmark-vert-white.svg"
          alt="GHOSTSignal"
          className={`${styles.logo} ${styles.logoDark}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/gs-brandmark-vert-dark.png"
          alt=""
          aria-hidden="true"
          className={`${styles.logo} ${styles.logoLight}`}
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
