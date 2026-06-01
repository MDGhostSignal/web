"use client";

import { useState } from "react";

import { PHASE1_QUESTIONS } from "@/lib/xq/constants";
import type { XQAnswers } from "@/lib/xq/scoring";

type Props = {
  initial: XQAnswers;
  onComplete: (answers: XQAnswers) => void;
};

/**
 * Phase 1 — Contextual Archetype Dilemmas. Renders all 18 binary
 * (A/B) questions on a single scrollable screen, matching Jeremy's
 * draft layout. User must answer every dilemma before Continue
 * enables; unanswered cards are highlighted in red so the user can
 * see exactly which dilemmas are missing.
 */
export function Phase1Step({ initial, onComplete }: Props) {
  const [answers, setAnswers] = useState<XQAnswers>(initial);
  /** Set of unanswered question ids flagged on the last submit attempt. */
  const [missing, setMissing] = useState<Set<string>>(new Set());

  function pick(id: string, value: "a" | "b") {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    // Clear the missing flag for this question as soon as it's answered.
    if (missing.has(id)) {
      setMissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function handleSubmit() {
    const unanswered = new Set(
      PHASE1_QUESTIONS.filter((q) => !answers[q.id]).map((q) => q.id),
    );
    if (unanswered.size > 0) {
      setMissing(unanswered);
      const firstId = PHASE1_QUESTIONS.find((q) => unanswered.has(q.id))?.id;
      if (firstId) {
        document.getElementById(`xq-q-${firstId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }
    setMissing(new Set());
    onComplete(answers);
  }

  return (
    <>
      <h2 className="xq-stage-title">
        Phase 1 · Tactical Tension &amp; Cross-Validation Matrix
      </h2>
      <p className="xq-stage-lede">
        Triangulation dilemmas. For each, choose the side that better
        reflects your operational reality — even when both feel partly
        true. There are no right answers; consistency is what surfaces
        your archetype.
      </p>

      {PHASE1_QUESTIONS.map((q, idx) => {
        const isMissing = missing.has(q.id);
        return (
          <div
            key={q.id}
            id={`xq-q-${q.id}`}
            className={`xq-q-block ${isMissing ? "invalid" : ""}`}
          >
            <div className="xq-q-tag">
              Dilemma · Context Layer {String(idx + 1).padStart(2, "0")}
            </div>
            <p className="xq-q-text">{q.text}</p>
            <div className="xq-q-options">
              <label className="xq-opt">
                <input
                  type="radio"
                  name={q.id}
                  value="a"
                  checked={answers[q.id] === "a"}
                  onChange={() => pick(q.id, "a")}
                />
                <span>{q.aLabel}</span>
              </label>
              <label className="xq-opt">
                <input
                  type="radio"
                  name={q.id}
                  value="b"
                  checked={answers[q.id] === "b"}
                  onChange={() => pick(q.id, "b")}
                />
                <span>{q.bLabel}</span>
              </label>
            </div>
            {isMissing && (
              <p className="xq-q-block-error" role="alert">
                Please choose A or B for this dilemma.
              </p>
            )}
          </div>
        );
      })}

      {missing.size > 0 && (
        <div className="xq-err" role="alert">
          {missing.size === 1
            ? "1 dilemma is unanswered — highlighted above."
            : `${missing.size} dilemmas are unanswered — highlighted above.`}
        </div>
      )}

      <button type="button" className="xq-btn" onClick={handleSubmit}>
        Proceed to Phase 2 →
      </button>
    </>
  );
}
