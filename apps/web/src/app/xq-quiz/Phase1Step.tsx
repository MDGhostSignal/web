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
 * enables; the error banner explains why if they try early.
 */
export function Phase1Step({ initial, onComplete }: Props) {
  const [answers, setAnswers] = useState<XQAnswers>(initial);
  const [showErr, setShowErr] = useState(false);

  function pick(id: string, value: "a" | "b") {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (showErr) setShowErr(false);
  }

  function handleSubmit() {
    const unanswered = PHASE1_QUESTIONS.some((q) => !answers[q.id]);
    if (unanswered) {
      setShowErr(true);
      // Scroll the first unanswered into view.
      const first = PHASE1_QUESTIONS.find((q) => !answers[q.id]);
      if (first) {
        document.getElementById(`xq-q-${first.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }
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

      {PHASE1_QUESTIONS.map((q, idx) => (
        <div key={q.id} id={`xq-q-${q.id}`} className="xq-q-block">
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
        </div>
      ))}

      {showErr && (
        <div className="xq-err" role="alert">
          Please evaluate every dilemma so the triangulation engine can
          calibrate.
        </div>
      )}

      <button type="button" className="xq-btn" onClick={handleSubmit}>
        Proceed to Phase 2 →
      </button>
    </>
  );
}
