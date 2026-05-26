"use client";

import { useState } from "react";

import type { XQStressInput } from "@/lib/xq/scoring";

type Props = {
  /** The 14 value-name strings derived from Phase 2 picks — the pool
   *  the user filters through the three stress tests. */
  pool: string[];
  initial: XQStressInput;
  onComplete: (stress: XQStressInput) => void;
};

type BucketKey = "nonNegotiables" | "core" | "aspirational";

/**
 * Phase 3 — Operational Stratification Stress Test. Three checkbox
 * grids over the same pool of 14 selected values:
 *
 *   nonNegotiables — convictions you'd fiercely protect at financial
 *                    cost (red tint).
 *   core           — convictions present in your daily habits right
 *                    now (accent tint).
 *   aspirational   — convictions you're actively building toward
 *                    over the next year (purple tint).
 *
 * The scoring layer (`classifyBuckets` in @/lib/xq/scoring) routes any
 * value not picked in any test into a fourth "background" bucket.
 * Same value can be ticked in multiple tests — the classifier resolves
 * the conflict by priority (non-negotiable > core > aspirational).
 */
export function Phase3Step({ pool, initial, onComplete }: Props) {
  const [stress, setStress] = useState<XQStressInput>(initial);

  function toggle(bucket: BucketKey, value: string) {
    setStress((prev) => {
      const has = prev[bucket].includes(value);
      const next = has
        ? prev[bucket].filter((v) => v !== value)
        : [...prev[bucket], value];
      return { ...prev, [bucket]: next };
    });
  }

  function renderTest(
    bucket: BucketKey,
    title: string,
    description: string,
    prompt: string,
    tintClass: string,
  ) {
    const picked = stress[bucket];
    return (
      <div className="xq-q-block">
        <div
          className={`xq-q-tag ${tintClass === "" ? "" : `xq-q-tag-${tintClass}`}`}
          style={
            tintClass === "nn"
              ? { color: "var(--xq-nn)" }
              : tintClass === "asp"
                ? { color: "var(--xq-asp)" }
                : undefined
          }
        >
          {title}
        </div>
        <p className="xq-q-text">{description}</p>
        <span className="xq-stress-help">{prompt}</span>
        <div className="xq-stress-grid">
          {pool.map((v) => {
            const checked = picked.includes(v);
            const classes = [
              "xq-stress-box",
              checked ? "checked" : "",
              checked ? tintClass : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <label key={`${bucket}-${v}`} className={classes}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(bucket, v)}
                />
                <span>{v}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="xq-stage-title">
        Phase 3 · Operational Stratification Stress Test
      </h2>
      <p className="xq-stage-lede">
        Pass your 14 surfaced values through three diagnostic stress
        environments. Same value can be ticked in more than one test —
        the engine resolves conflicts by priority
        (non-negotiable &rarr; core &rarr; aspirational).
      </p>

      {renderTest(
        "nonNegotiables",
        "Stress Test 01 · The Revenue Burn",
        "An intense market correction threatens your operational runway. A high-margin client offers an all-cash contract that secures two years of cash flow — but executing it demands you dilute, hide, or compromise your principles.",
        "Select the convictions you would fiercely protect, turning down the contract and accepting financial loss rather than breaking them:",
        "nn",
      )}

      {renderTest(
        "core",
        "Stress Test 02 · The Default Instinct",
        "Audit your actual history: your calendar blocks, your bank ledgers, your last three internal arguments. When deadlines are tight and you're operating under pure survival pressure, your organic baseline default prioritizes certain mechanics above all else.",
        "Select the convictions that are actively and explicitly present in your daily habits right now:",
        "",
      )}

      {renderTest(
        "aspirational",
        "Stress Test 03 · The Future Horizon",
        "There are noble elements of your ethos that you hold in high regard, but looking at your operations honestly, they aren't fully deployed yet. They represent your next intentional evolution — a standard you are actively working to build out.",
        "Select the convictions that represent your intended growth targets for the coming year:",
        "asp",
      )}

      <button type="button" className="xq-btn" onClick={() => onComplete(stress)}>
        Generate My Conviction Blueprint
      </button>
    </>
  );
}
