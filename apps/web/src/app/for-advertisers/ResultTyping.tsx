"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

import styles from "./ResultTyping.module.css";

type Props = {
  /** Lines to type out in order. Each line renders on its own row. */
  lines: readonly string[];
  /** ms per character. Matches the homepage typing hero (130ms). */
  typeMs?: number;
  /** ms pause between finishing one line and starting the next. */
  lineGapMs?: number;
  /**
   * After the final line finishes, hold, delete it, pause, and
   * retype it -- indefinitely. Preceding lines stay pinned in place.
   * Leave false (default) for one-shot typing.
   */
  loopLastLine?: boolean;
  /** ms per character during the delete pass of the loop. */
  deleteMs?: number;
  /** ms to hold the fully-typed last line before starting a delete. */
  holdFullMs?: number;
  /** ms to hold after the last line is fully deleted before retyping. */
  holdEmptyMs?: number;
};

/**
 * Scroll-triggered typing headline. Types through each line
 * character-by-character with the same blur-in entrance the homepage
 * hero uses; the caret hops from line to line as each finishes.
 *
 * - Triggers once when the block first crosses into the viewport.
 * - Runs through the lines exactly once (no loop) and stops with
 *   a blinking caret parked at the end of the last character.
 * - `prefers-reduced-motion: reduce` short-circuits to the full text
 *   so the content is still accessible.
 */
export function ResultTyping({
  lines,
  typeMs = 130,
  lineGapMs = 450,
  loopLastLine = false,
  deleteMs = 55,
  holdFullMs = 2200,
  holdEmptyMs = 450,
}: Props): ReactElement {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [started, setStarted] = useState(false);
  // Per-line visible length. 0 before the line starts, full length
  // once it finishes. Using an array so React renders only the
  // currently-typing line's characters incrementally.
  const [visible, setVisible] = useState<number[]>(() =>
    lines.map(() => 0),
  );

  // Scroll trigger: start typing when the block first enters view.
  useEffect(() => {
    if (started || !rootRef.current) return;
    const node = rootRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true);
            io.disconnect();
            return;
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [started]);

  // Typing driver. Runs a cascade of setTimeouts — one per character
  // — through each line in sequence. Cancels cleanly on unmount.
  useEffect(() => {
    if (!started) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Intentional post-mount setState: reading matchMedia is a
      // client-only capability probe, so the reduced-motion shortcut
      // can only run here -- not during SSR/initial render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(lines.map((l) => l.length));
      return;
    }

    let cancelled = false;
    let tid: ReturnType<typeof setTimeout> | null = null;
    const schedule = (fn: () => void, ms: number) => {
      tid = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const lastIdx = lines.length - 1;
    const lastLen = lines[lastIdx]?.length ?? 0;

    const typeChar = (lineIdx: number, charIdx: number) => {
      if (cancelled || lineIdx >= lines.length) return;
      setVisible((prev) => {
        const next = prev.slice();
        next[lineIdx] = charIdx;
        return next;
      });
      if (charIdx >= lines[lineIdx].length) {
        // Finished a line. If it was the last one and looping is
        // enabled, enter the delete/retype loop; otherwise advance.
        if (lineIdx === lastIdx) {
          if (loopLastLine && lastLen > 0) {
            schedule(() => deleteChar(lastLen), holdFullMs);
          }
          return;
        }
        schedule(() => typeChar(lineIdx + 1, 1), lineGapMs);
        return;
      }
      schedule(() => typeChar(lineIdx, charIdx + 1), typeMs);
    };

    const deleteChar = (charIdx: number) => {
      if (cancelled) return;
      setVisible((prev) => {
        const next = prev.slice();
        next[lastIdx] = charIdx;
        return next;
      });
      if (charIdx <= 0) {
        // Fully deleted -- hold, then retype. Retype uses the same
        // typeChar walker so blur-in entrance runs per character.
        schedule(() => typeChar(lastIdx, 1), holdEmptyMs);
        return;
      }
      schedule(() => deleteChar(charIdx - 1), deleteMs);
    };

    schedule(() => typeChar(0, 1), 0);

    return () => {
      cancelled = true;
      if (tid) clearTimeout(tid);
    };
  }, [
    started,
    lines,
    typeMs,
    lineGapMs,
    loopLastLine,
    deleteMs,
    holdFullMs,
    holdEmptyMs,
  ]);

  // Which line currently holds the caret: the first line that's
  // still mid-type, or the last line once everything is done.
  const activeLineIdx = (() => {
    for (let i = 0; i < lines.length; i++) {
      if (visible[i] < lines[i].length) return i;
    }
    return lines.length - 1;
  })();

  return (
    <span ref={rootRef} className={styles.block}>
      {lines.map((line, lineIdx) => {
        const len = visible[lineIdx] ?? 0;
        const chars: ReactElement[] = [];
        for (let i = 0; i < len; i++) {
          const ch = line[i];
          chars.push(
            <span key={`${lineIdx}-${i}`} className={styles.ch}>
              {ch === " " ? "\u00a0" : ch}
            </span>,
          );
        }
        return (
          <span key={lineIdx} className={styles.line}>
            {chars}
            {started && lineIdx === activeLineIdx && (
              <span className={styles.cursor} aria-hidden="true" />
            )}
          </span>
        );
      })}
    </span>
  );
}
