"use client";

import { useState } from "react";

import { PHASE2_QUESTIONS } from "@/lib/xq/constants";
import type { XQAnswers } from "@/lib/xq/scoring";

type Props = {
  initial: XQAnswers;
  /** Called with the merged answers (phase 1 + phase 2) once every
   *  Phase 2 question has been answered. */
  onComplete: (answers: XQAnswers) => void;
};

/**
 * Phase 2 — Core Conviction Diagnostic. 14 binary questions across
 * 7 value domains (Stewardship, Human Dignity, Cultural Imagination,
 * Social Order, Economic Ethic, Meaning & Metaphysics, Risk & Change).
 *
 * Each answer maps to a named value string (aValue / bValue on the
 * question def). The 14 chosen value strings become the user's
 * "value pool" that Phase 3 stress-tests over.
 *
 * `initial` holds whatever phase 1 + phase 2 answers already exist,
 * so navigating back/forward preserves prior picks.
 */
export function Phase2Step({ initial, onComplete }: Props) {
  const [answers, setAnswers] = useState<XQAnswers>(initial);
  const [showErr, setShowErr] = useState(false);

  function pick(id: string, value: "a" | "b") {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (showErr) setShowErr(false);
  }

  function handleSubmit() {
    const unanswered = PHASE2_QUESTIONS.some((q) => !answers[q.id]);
    if (unanswered) {
      setShowErr(true);
      const first = PHASE2_QUESTIONS.find((q) => !answers[q.id]);
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
        Phase 2 · Core Conviction Diagnostic
      </h2>
      <p className="xq-stage-lede">
        Fourteen behavior-based dilemmas across the seven{" "}
        <span className="gs-brand">
          <span className="gs-brand-ghost">GHOST</span>
          <span className="gs-brand-signal">Signal</span>
        </span>{" "}
        value domains. Your choices unearth the implicit values driving
        your operating style.
      </p>

      {PHASE2_QUESTIONS.map((q) => (
        <div key={q.id} id={`xq-q-${q.id}`} className="xq-q-block">
          <div className="xq-q-tag">
            Domain · {q.domain}
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
          Please answer every domain question to map your underlying
          convictions.
        </div>
      )}

      <button type="button" className="xq-btn" onClick={handleSubmit}>
        Proceed to Operational Stress Test →
      </button>
    </>
  );
}
