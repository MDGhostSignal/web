"use client";

import { useEffect, useState, type ReactElement } from "react";

import styles from "./HomeTypingLoop.module.css";

/* Line 1 broken into styled segments so brand typography ("GHOST" bold
   uppercase, "Signal" thin) renders correctly as characters are typed
   in one at a time. Offsets are derived so the character-by-character
   reveal can find the right segment/class for any partial length. */
const LINE_1_SEGMENTS = [
  { text: "GHOST", className: "ghost" as const },
  { text: "Signal", className: "signal" as const },
  { text: " is for people", className: "plain" as const },
];
const LINE_1_FULL_LEN = LINE_1_SEGMENTS.reduce((n, s) => n + s.text.length, 0);

const LINE_2_PREFIX = "who are ";
const SUFFIXES = [
  "making the world.",
  "creating the world.",
  "shaping the world.",
] as const;
const LINE_2_VARIANTS = SUFFIXES.map((s) => LINE_2_PREFIX + s);
const LINE_2_PREFIX_LEN = LINE_2_PREFIX.length;

const TYPE_MS = 130;
const DELETE_MS = 55;
const HOLD_MS = 2200;
const LINE_GAP_MS = 450;

export function HomeTypingHero() {
  const [line1Len, setLine1Len] = useState(0);
  const [line2Text, setLine2Text] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let variantIdx = 0;

    const schedule = (fn: () => void, ms: number) => {
      timeoutId = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const typeLine1 = (idx: number) => {
      if (cancelled) return;
      setLine1Len(idx);
      if (idx >= LINE_1_FULL_LEN) {
        schedule(() => typeLine2Initial(1), LINE_GAP_MS);
        return;
      }
      schedule(() => typeLine1(idx + 1), TYPE_MS);
    };

    const typeLine2Initial = (idx: number) => {
      if (cancelled) return;
      const target = LINE_2_VARIANTS[0];
      setLine2Text(target.slice(0, idx));
      if (idx >= target.length) {
        schedule(() => {
          variantIdx = (variantIdx + 1) % LINE_2_VARIANTS.length;
          deleteToPrefix(target);
        }, HOLD_MS);
        return;
      }
      schedule(() => typeLine2Initial(idx + 1), TYPE_MS);
    };

    const deleteToPrefix = (current: string) => {
      if (cancelled) return;
      if (current.length <= LINE_2_PREFIX_LEN) {
        typeVariantSuffix(LINE_2_PREFIX_LEN + 1);
        return;
      }
      const next = current.slice(0, -1);
      setLine2Text(next);
      schedule(() => deleteToPrefix(next), DELETE_MS);
    };

    const typeVariantSuffix = (idx: number) => {
      if (cancelled) return;
      const target = LINE_2_VARIANTS[variantIdx];
      setLine2Text(target.slice(0, idx));
      if (idx >= target.length) {
        schedule(() => {
          variantIdx = (variantIdx + 1) % LINE_2_VARIANTS.length;
          deleteToPrefix(target);
        }, HOLD_MS);
        return;
      }
      schedule(() => typeVariantSuffix(idx + 1), TYPE_MS);
    };

    typeLine1(1);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const line1Done = line1Len >= LINE_1_FULL_LEN;
  const cursorOnLine1 = !line1Done;

  return (
    <>
      <span className={styles.line}>
        {renderLine1Chars(line1Len)}
        {cursorOnLine1 && <Caret />}
      </span>
      <span className={styles.line}>
        {line1Done && (
          <>
            {renderLine2Chars(line2Text)}
            <Caret />
          </>
        )}
      </span>
    </>
  );
}

function Caret() {
  return <span className={styles.cursor} aria-hidden="true" />;
}

/* Each character gets a stable key tied to its absolute position in
   the line. New spans (at newly-exposed indices) mount with the
   `.ch` entrance animation; already-rendered spans keep their DOM
   node so they don't re-animate on every state change. */
function renderLine1Chars(visibleLen: number): ReactElement[] {
  const chars: ReactElement[] = [];
  let offset = 0;
  for (const [segI, seg] of LINE_1_SEGMENTS.entries()) {
    const sliceLen = Math.max(0, Math.min(seg.text.length, visibleLen - offset));
    for (let i = 0; i < sliceLen; i++) {
      const ch = seg.text[i];
      chars.push(
        <span
          key={`s${segI}-${i}`}
          className={`${styles[seg.className]} ${styles.ch}`}
        >
          {ch === " " ? "\u00a0" : ch}
        </span>,
      );
    }
    offset += seg.text.length;
  }
  return chars;
}

function renderLine2Chars(text: string): ReactElement[] {
  const chars: ReactElement[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    chars.push(
      <span key={`l2-${i}`} className={styles.ch}>
        {ch === " " ? "\u00a0" : ch}
      </span>,
    );
  }
  return chars;
}
