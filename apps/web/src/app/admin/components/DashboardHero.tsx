"use client";

import { useEffect, useRef } from "react";

import styles from "./DashboardHero.module.css";

/**
 * Motivational banner atop the admin dashboard — a dark "signal field"
 * panel with an animated 3D wireframe mesh rippling in perspective,
 * behind the GHOSTSignal cloud brandmark, a co-founder rallying line,
 * and a morse strip that transmits the same phrase.
 *
 * The mesh is a hand-rolled canvas effect (no libs): a grid of vertices
 * on an X/Z plane displaced by travelling sine waves, projected with a
 * cheap perspective and drawn as glowing wireframe segments that fade
 * into the distance. Respects prefers-reduced-motion (renders one still
 * frame), scales for DPR, and re-fits on resize.
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

/* ------------------------------ mesh ------------------------------- */

const COLS = 30; // vertices across
const ROWS = 16; // vertices in depth

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function drawMesh(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
) {
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const spanX = w * 0.92; // plane width in screen units at the front
  const focal = 480;
  const depthUnit = 46; // z-distance between rows
  const zNear = 90;
  const horizonY = h * 0.34; // where far rows converge
  const frontY = h * 0.98; // baseline of the nearest row
  const amp = 26; // wave height

  // Precompute projected points [row][col] = {x, y, depthT}
  const pts: Array<Array<{ x: number; y: number; t: number }>> = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Array<{ x: number; y: number; t: number }> = [];
    const z = zNear + r * depthUnit;
    const persp = focal / (focal + z);
    const depthT = r / (ROWS - 1); // 0 near → 1 far
    const baseY = lerp(frontY, horizonY, depthT);
    for (let c = 0; c < COLS; c++) {
      const gx = c / (COLS - 1) - 0.5; // -0.5 .. 0.5
      // Two travelling waves for an organic ripple.
      const wave =
        Math.sin(gx * 6 + time * 1.1 + r * 0.35) *
          Math.cos(r * 0.5 - time * 0.9) +
        Math.sin(r * 0.8 + time * 0.6) * 0.5;
      const x = cx + gx * spanX * persp;
      const y = baseY + wave * amp * persp;
      row.push({ x, y, t: depthT });
    }
    pts.push(row);
  }

  ctx.lineWidth = 1;
  ctx.shadowBlur = 8;

  const stroke = (t: number) => {
    // Near = bright blue, far = deep violet, fading out.
    const rr = Math.round(lerp(150, 96, t));
    const gg = Math.round(lerp(170, 70, t));
    const bb = Math.round(lerp(255, 210, t));
    const alpha = lerp(0.85, 0.05, t);
    const col = `rgba(${rr},${gg},${bb},${alpha})`;
    ctx.strokeStyle = col;
    ctx.shadowColor = `rgba(${rr},${gg},${bb},${alpha * 0.8})`;
  };

  // Horizontal lines (along each row).
  for (let r = 0; r < ROWS; r++) {
    stroke(pts[r][0].t);
    ctx.beginPath();
    for (let c = 0; c < COLS; c++) {
      const p = pts[r][c];
      if (c === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // Vertical lines (along each column).
  for (let c = 0; c < COLS; c++) {
    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) {
      const p = pts[r][c];
      if (r === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
      // Recolor per-segment by depth for a smooth near→far fade.
      if (r > 0) {
        ctx.stroke();
        stroke(p.t);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      } else {
        stroke(p.t);
      }
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
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

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) drawMesh(ctx, w, h, 0.4);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    if (!reduce) {
      const start = performance.now();
      const loop = (now: number) => {
        drawMesh(ctx, w, h, (now - start) / 1000);
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
      <canvas ref={canvasRef} className={styles.mesh} aria-hidden="true" />
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
