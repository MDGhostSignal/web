"use client";

import { useEffect, useRef } from "react";
import SplitType from "split-type";

import { gsap } from "@/motion/gsap";

import styles from "./PreviewFeatureBuild.module.css";

const MORSE_CODE: Record<string, string> = {
  Y: "-.--",
  O: "---",
  U: "..-",
  C: "-.-.",
  A: ".-",
  N: "-.",
  S: "...",
  T: "-",
  P: ".--.",
  H: "....",
  E: ".",
  G: "--.",
  I: "..",
  L: ".-..",
  " ": "/",
};

const PHRASE = "YOU CAN STOP THE SIGNAL";

/** Same mark sequence as the RQ quiz progress bar. */
function morseSequence(): Array<"." | "-" | "|" | "/"> {
  const result: Array<"." | "-" | "|" | "/"> = [];
  for (let i = 0; i < PHRASE.length; i++) {
    const morse = MORSE_CODE[PHRASE[i]];
    if (!morse) continue;
    if (morse === "/") {
      result.push("/");
      continue;
    }
    for (const symbol of morse) result.push(symbol as "." | "-");
    if (i < PHRASE.length - 1 && PHRASE[i + 1] !== " ") result.push("|");
  }
  return result;
}

const SEQUENCE = morseSequence();
const LOOP = 11;

const COLORS = ["#00B29C", "#FBAD25", "#D66157"] as const;

type Step = { title: string; description: string };

/**
 * Preview sequence. Three cards, then a summary line.
 * The rail is the RQ quiz progress marks, turned vertical.
 * The summary uses the hero line-reveal.
 */
export function PreviewFeatureBuild({
  steps,
  conclusion,
}: {
  steps: readonly Step[];
  conclusion: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const summary = summaryRef.current;
    if (!rail || !summary) return;

    const marks = Array.from(rail.querySelectorAll<HTMLElement>("[data-mark]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const split = new SplitType(summary, { types: "lines" });
    const lines = split.lines ?? [];
    if (lines.length) {
      gsap.set(lines, {
        overflow: "hidden",
        paddingBottom: "calc(var(--gs-n-12) * var(--gs-px))",
        marginBottom: "calc(0px - (var(--gs-n-12) * var(--gs-px)))",
      });
    }
    const inner = new SplitType(lines, { types: "lines" });
    const revealLines = inner.lines ?? [];
    gsap.set(revealLines, { yPercent: reduce ? 0 : 160 });

    if (reduce) {
      marks.forEach((mark) => mark.classList.add(styles.on));
      return () => {
        inner.revert();
        split.revert();
      };
    }

    let frame = 0;
    let start = 0;
    let revealed = false;
    let tween: gsap.core.Tween | null = null;

    const tick = (now: number) => {
      if (!start) start = now;
      const progress = ((now - start) / 1000) % LOOP / LOOP;
      const lit = progress < 0.88 ? progress / 0.8 : 0;
      const count = Math.floor(lit * marks.length);
      marks.forEach((mark, index) => mark.classList.toggle(styles.on, index < count));

      if (progress >= 0.68 && progress < 0.9) {
        if (!revealed) {
          revealed = true;
          tween?.kill();
          tween = gsap.fromTo(
            revealLines,
            { yPercent: 160 },
            { yPercent: 0, duration: 0.9, stagger: 0.16, ease: "expo.out" },
          );
        }
      } else if (progress < 0.08 && revealed) {
        revealed = false;
        tween?.kill();
        gsap.set(revealLines, { yPercent: 160 });
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      tween?.kill();
      inner.revert();
      split.revert();
    };
  }, [conclusion]);

  return (
    <div className={styles.stack}>
      <div ref={railRef} className={styles.rail} aria-hidden="true">
        {SEQUENCE.map((symbol, index) => {
          if (symbol === "/") return <span key={index} className={styles.wordGap} />;
          if (symbol === "|") return <span key={index} className={styles.letterGap} />;
          return (
            <span
              key={index}
              data-mark=""
              className={symbol === "." ? styles.dot : styles.dash}
            />
          );
        })}
      </div>
      <ol className={styles.list}>
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={styles.step}
            style={{ "--step-color": COLORS[index % COLORS.length] } as React.CSSProperties}
          >
            <span className={styles.index} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.body}>{step.description}</p>
          </li>
        ))}
        <li className={styles.conclusion}>
          <p ref={summaryRef} className={styles.conclusionText}>
            {conclusion}
          </p>
        </li>
      </ol>
    </div>
  );
}
