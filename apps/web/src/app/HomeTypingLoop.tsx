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
const SPLIT_LINE_1_SEGMENTS = LINE_1_SEGMENTS.slice(0, 2);
const SPLIT_MID_LINE = "for people";

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

export function HomeTypingHero({ layout = "home" }: { layout?: "home" | "split" } = {}) {
  const [line1Len, setLine1Len] = useState(0);
  const [midLen, setMidLen] = useState(0);
  const [line2Text, setLine2Text] = useState("");
  const line1Segments = layout === "split" ? SPLIT_LINE_1_SEGMENTS : LINE_1_SEGMENTS;
  const line1FullLen = line1Segments.reduce((n, s) => n + s.text.length, 0);

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
      if (idx >= line1FullLen) {
        if (layout === "split") {
          schedule(() => typeMid(1), LINE_GAP_MS);
        } else {
          schedule(() => typeLine2Initial(1), LINE_GAP_MS);
        }
        return;
      }
      schedule(() => typeLine1(idx + 1), TYPE_MS);
    };

    const typeMid = (idx: number) => {
      if (cancelled) return;
      setMidLen(idx);
      if (idx >= SPLIT_MID_LINE.length) {
        schedule(() => typeLine2Initial(1), LINE_GAP_MS);
        return;
      }
      schedule(() => typeMid(idx + 1), TYPE_MS);
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
  }, [layout, line1FullLen]);

  const line1Done = line1Len >= line1FullLen;
  const midDone = layout !== "split" || midLen >= SPLIT_MID_LINE.length;
  const cursorOnLine1 = !line1Done;
  const cursorOnMid = layout === "split" && line1Done && !midDone;

  return (
    <>
      <span className={styles.line}>
        {renderLine1Chars(line1Len, line1Segments)}
        {cursorOnLine1 && <Caret />}
      </span>
      {layout === "split" && (
        <span className={styles.line}>
          {line1Done && (
            <>
              {renderLine2Chars(SPLIT_MID_LINE.slice(0, midLen), "mid")}
              {cursorOnMid && <Caret />}
            </>
          )}
        </span>
      )}
      <span className={styles.line}>
        {line1Done && midDone && (
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
   node so they don't re-animate on every state change.

   Non-space chars are grouped into `<span class="word">` wrappers
   so the browser treats each word as one atomic line-break unit
   (see HomeTypingLoop.module.css `.word` for the why). The word
   wrapper's key is the absolute index of its first character so
   it stays stable as the word grows. */
type CharSpec = { ch: string; className: string; idx: number };

function renderWords(specs: CharSpec[], keyPrefix: string): ReactElement[] {
  const out: ReactElement[] = [];
  let wordChars: ReactElement[] = [];
  let wordStartIdx = -1;
  const flushWord = () => {
    if (wordChars.length === 0) return;
    out.push(
      <span key={`${keyPrefix}-w-${wordStartIdx}`} className={styles.word}>
        {wordChars}
      </span>,
    );
    wordChars = [];
    wordStartIdx = -1;
  };
  for (const { ch, className, idx } of specs) {
    if (ch === " ") {
      flushWord();
      out.push(
        <span key={`${keyPrefix}-sp-${idx}`} className={styles.ch}>
          {"\u00a0"}
        </span>,
      );
      continue;
    }
    if (wordStartIdx === -1) wordStartIdx = idx;
    const classNames = className && styles[className]
      ? `${styles[className]} ${styles.ch}`
      : styles.ch;
    wordChars.push(
      <span key={`${keyPrefix}-c-${idx}`} className={classNames}>
        {ch}
      </span>,
    );
  }
  flushWord();
  return out;
}

function renderLine1Chars(
  visibleLen: number,
  segments: typeof LINE_1_SEGMENTS,
): ReactElement[] {
  const specs: CharSpec[] = [];
  let offset = 0;
  for (const seg of segments) {
    const sliceLen = Math.max(0, Math.min(seg.text.length, visibleLen - offset));
    for (let i = 0; i < sliceLen; i++) {
      specs.push({ ch: seg.text[i], className: seg.className, idx: offset + i });
    }
    offset += seg.text.length;
  }
  return renderWords(specs, "l1");
}

function renderLine2Chars(text: string, keyPrefix = "l2"): ReactElement[] {
  const specs: CharSpec[] = [];
  for (let i = 0; i < text.length; i++) {
    specs.push({ ch: text[i], className: "", idx: i });
  }
  return renderWords(specs, keyPrefix);
}
