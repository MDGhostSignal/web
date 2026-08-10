"use client";

import { useEffect, useState } from "react";

import { RQ3DWordmark, XQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";
import { RQResultsGraph } from "@/components/rq/RQResultsGraph";
import {
  XQSpectrumMap,
  type SpectrumPosition,
} from "@/components/xq/XQSpectrumMap";
import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";
import type { RQResult } from "@/lib/rq/scoring";
import type { StudioRqSummary, StudioXqSummary } from "@/lib/studio-data";

import { RqProfileCard } from "./RqProfileCard";
import { XqProfileCard } from "./XqProfileCard";
import styles from "./ResultTiles.module.css";

/**
 * The two result tiles on /studio/results — XQ (left) + RQ (right).
 * Each is a compact, clickable card: a small centered 3D wordmark + a
 * one-line read (XQ = archetype name + quote; RQ = code + resonance
 * name). Clicking opens a modal with the complete reveal — full value
 * buckets + the spectrum map for XQ, the radar graph + per-axis prose
 * for RQ.
 */

/** Approximate the user's spectrum position from the stored axis letters.
 *  The exact magnitude isn't persisted (only the winning letter), so we
 *  place the point firmly inside their quadrant — the archetype ring
 *  (`highlight`) carries the precise "where you land". */
function positionFromLetters(
  axes: StudioXqSummary["axes"],
): SpectrumPosition | undefined {
  if (!axes.continuityChange || !axes.personSystem || !axes.craftLeverage) {
    return undefined;
  }
  const M = 0.72;
  return {
    axis1: axes.continuityChange === "C" ? M : -M,
    axis2: axes.personSystem === "P" ? M : -M,
    axis3: axes.craftLeverage === "C" ? M : -M,
  };
}

/** Build the RQResultsGraph input from a StudioRqSummary (same axis
 *  shape). Returns null when any axis is missing — the graph needs all
 *  three. */
function toRqResult(summary: StudioRqSummary | null): RQResult | null {
  if (!summary) return null;
  const { values, authenticity, horizon } = summary.details;
  if (!values || !authenticity || !horizon) return null;
  return {
    rq: summary.code ?? "",
    rqName: summary.name ?? "",
    details: { values, authenticity, horizon },
    profile: {
      values: summary.profile.values ?? "",
      authenticity: summary.profile.authenticity ?? "",
      horizon: summary.profile.horizon ?? "",
    },
  };
}

export function ResultTiles({
  xqSummary,
  rqSummary,
  xqFallback,
  rqFallback,
}: {
  xqSummary: StudioXqSummary | null;
  rqSummary: StudioRqSummary | null;
  xqFallback: string | null;
  rqFallback: string | null;
}) {
  const [open, setOpen] = useState<"xq" | "rq" | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const xqCode = (xqSummary?.code ?? xqFallback) as ArchetypeCode | null;
  const xqIdentity = xqCode ? CHARACTERS[xqCode] : undefined;
  const xqName = xqSummary?.archetypeName ?? null;
  const xqTagline = xqSummary?.tagline ?? null;
  const xqAccent = xqIdentity?.accent ?? "#7c58d6";
  const xqDone = Boolean(xqCode);

  const rqCode = rqSummary?.code ?? rqFallback;
  const rqName = rqSummary?.name ?? null;
  const rqClarity = rqSummary?.clarityLabel ?? null;
  const rqDone = Boolean(rqCode);

  const xqPosition = xqSummary ? positionFromLetters(xqSummary.axes) : undefined;
  const rqResult = toRqResult(rqSummary);

  return (
    <>
      <div className={styles.grid}>
        {/* ---- XQ tile ---- */}
        <div
          className={styles.tile}
          style={{ "--tile-accent": xqAccent } as React.CSSProperties}
        >
          <div className={styles.logo}>
            <XQ3DWordmark />
          </div>
          {xqDone ? (
            <>
              <div className={styles.tileBody}>
                <div className={styles.name}>{xqName ?? xqCode}</div>
                {xqTagline && (
                  <p className={styles.quote}>&ldquo;{xqTagline}&rdquo;</p>
                )}
              </div>
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setOpen("xq")}
              >
                See full result
              </button>
            </>
          ) : (
            <TakePrompt
              href="/xq-quiz"
              label="Take the XQ"
              blurb="Map your conviction across the eight archetypes."
            />
          )}
        </div>

        {/* ---- RQ tile ---- */}
        <div className={styles.tile}>
          <div className={styles.logo}>
            <RQ3DWordmark />
          </div>
          {rqDone ? (
            <>
              <div className={styles.tileBody}>
                <div className={styles.rqCode}>{rqCode}</div>
                {rqName && <div className={styles.name}>{rqName}</div>}
                {rqClarity && (
                  <span className={styles.claritySmall}>
                    {rqClarity} signal
                  </span>
                )}
              </div>
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setOpen("rq")}
              >
                See full result
              </button>
            </>
          ) : (
            <TakePrompt
              href="/rq-quiz"
              label="Take the RQ"
              blurb="See how your brand or show actually lands."
            />
          )}
        </div>
      </div>

      {open && (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => setOpen(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={() => setOpen(null)}
            >
              ×
            </button>

            {open === "xq" ? (
              <div className={styles.modalBody}>
                <XqProfileCard summary={xqSummary} fallbackCode={xqFallback} />
                {xqPosition && xqCode && (
                  <section className={styles.mapSection}>
                    <h4 className={styles.mapTitle}>Where you land</h4>
                    <XQSpectrumMap
                      position={xqPosition}
                      highlight={xqCode}
                      pointLabel="You"
                    />
                  </section>
                )}
              </div>
            ) : (
              <div className={styles.modalBody}>
                <RqProfileCard summary={rqSummary} fallbackCode={rqFallback} />
                {rqResult && (
                  <section className={styles.mapSection}>
                    <h4 className={styles.mapTitle}>Your resonance graph</h4>
                    <RQResultsGraph result={rqResult} />
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TakePrompt({
  href,
  label,
  blurb,
}: {
  href: string;
  label: string;
  blurb: string;
}) {
  return (
    <div className={styles.tileBody}>
      <p className={styles.emptyBlurb}>{blurb}</p>
      <a className={styles.expandBtn} href={href}>
        {label} →
      </a>
    </div>
  );
}
