"use client";

import { useMemo, useState } from "react";

import { BRAND, PHASE2_QUESTIONS } from "@/lib/xq/constants";
import {
  computeXQ,
  extractValuesPool,
  type XQAnswers,
  type XQResult,
  type XQStressInput,
} from "@/lib/xq/scoring";

import { ContactStep } from "./ContactStep";
import { IntroStep } from "./IntroStep";
import { Phase1Step } from "./Phase1Step";
import { Phase2Step } from "./Phase2Step";
import { Phase3Step } from "./Phase3Step";
import { ResultsScreen } from "./ResultsScreen";
import { EMPTY_BASICS, type Basics, type Stage } from "./types";
import "./xq-quiz.css";

const STAGE_PROGRESS: Record<Stage, number> = {
  intro: 0,
  contact: 12,
  phase1: 33,
  phase2: 60,
  phase3: 85,
  results: 100,
};

const STAGE_PHASE_LABEL: Record<Stage, string> = {
  intro: "WELCOME",
  contact: "BASICS",
  phase1: "PHASE 1 OF 3",
  phase2: "PHASE 2 OF 3",
  phase3: "PHASE 3 OF 3",
  results: "COMPLETE",
};

type SubmitState =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

/**
 * /xq-quiz — public XQ Conviction Quotient quiz.
 *
 * State machine: intro → contact → phase1 → phase2 → phase3 → results.
 * Each stage is its own component (./IntroStep, ./ContactStep, etc.) —
 * this file is the orchestrator that owns the shared state (basics +
 * accumulated answers + stress inputs + result + submit status) and
 * picks which component to render.
 *
 * Submit strategy: contact step POSTs an "incomplete" lead row server-
 * side (so a partial drop-off still gets captured + emails a light
 * admin alert). The results stage POSTs a full "complete" row on
 * arrival, which triggers admin notification + user summary emails.
 */
export default function XQQuizPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [basics, setBasics] = useState<Basics>(EMPTY_BASICS);
  const [answers, setAnswers] = useState<XQAnswers>({});
  const [stress, setStress] = useState<XQStressInput>({
    nonNegotiables: [],
    core: [],
    aspirational: [],
  });
  const [result, setResult] = useState<XQResult | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ type: "idle" });

  const valuePool = useMemo(
    () => extractValuesPool(answers, PHASE2_QUESTIONS),
    [answers],
  );

  /** Fire the lead-capture POST (status=incomplete) once basics are
   *  collected. Best-effort — failure here doesn't block advancement
   *  because the user can still finish the quiz and the complete
   *  POST will write a fresh row at the end. */
  async function captureIncompleteLead(b: Basics) {
    try {
      await fetch("/api/xq-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "native-xq-index-v1",
          status: "incomplete",
          submittedAt: new Date().toISOString(),
          brand: {
            company: BRAND.company,
            acronym: BRAND.acronym,
            title: BRAND.title,
          },
          basics: { ...b },
          meta: {
            pageUrl: window.location.href,
            referrer: document.referrer || "",
            userAgent: navigator.userAgent,
          },
        }),
      });
    } catch {
      /* swallow — we'll persist the full row at the end either way */
    }
  }

  /** Compute the dossier + POST status=complete + show the results
   *  screen with inline submit status banner. */
  async function finalize(stressInput: XQStressInput) {
    const computed = computeXQ(answers, valuePool, stressInput);
    setResult(computed);
    setStage("results");
    setSubmit({ type: "submitting" });

    try {
      const res = await fetch("/api/xq-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "native-xq-index-v1",
          status: "complete",
          submittedAt: new Date().toISOString(),
          brand: {
            company: BRAND.company,
            acronym: BRAND.acronym,
            title: BRAND.title,
          },
          basics: { ...basics },
          answers: {
            ...answers,
            stress_nonNegotiables: stressInput.nonNegotiables,
            stress_core: stressInput.core,
            stress_aspirational: stressInput.aspirational,
          },
          result: {
            code: computed.code,
            archetypeName: computed.archetype.name,
            archetypeTagline: computed.archetype.tagline,
            profile: computed.archetype.desc,
            details: computed.details,
            vectorBias: computed.vectorBias,
            buckets: computed.buckets,
          },
          meta: {
            pageUrl: window.location.href,
            referrer: document.referrer || "",
            userAgent: navigator.userAgent,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmit({
        type: "success",
        message: "Your XQ dossier has been emailed to you.",
      });
    } catch (err) {
      console.error(err);
      setSubmit({
        type: "error",
        message:
          "We saved your dossier locally but couldn't persist it. " +
          "You can screenshot the page or come back and retake.",
      });
    }
  }

  return (
    <div className="xq-page">
      <div className="xq-container">
        {stage !== "intro" && stage !== "results" && (
          <>
            <div className="xq-header">
              <div>
                <h1>{BRAND.title}</h1>
                <p>{BRAND.subtitle}</p>
              </div>
              <div className="xq-phase-pill">{STAGE_PHASE_LABEL[stage]}</div>
            </div>
            <div
              className="xq-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={STAGE_PROGRESS[stage]}
            >
              <div
                className="xq-progress-fill"
                style={{ width: `${STAGE_PROGRESS[stage]}%` }}
              />
            </div>
          </>
        )}

        {stage === "intro" && (
          <IntroStep onBegin={() => setStage("contact")} />
        )}

        {stage === "contact" && (
          <ContactStep
            initial={basics}
            onSubmit={async (b) => {
              setBasics(b);
              await captureIncompleteLead(b);
              setStage("phase1");
            }}
          />
        )}

        {stage === "phase1" && (
          <Phase1Step
            initial={answers}
            onComplete={(a) => {
              setAnswers(a);
              setStage("phase2");
            }}
          />
        )}

        {stage === "phase2" && (
          <Phase2Step
            initial={answers}
            onComplete={(a) => {
              setAnswers(a);
              setStage("phase3");
            }}
          />
        )}

        {stage === "phase3" && (
          <Phase3Step
            pool={valuePool}
            initial={stress}
            onComplete={(s) => {
              setStress(s);
              void finalize(s);
            }}
          />
        )}

        {stage === "results" && result && (
          <ResultsScreen result={result} submitStatus={submit} />
        )}
      </div>
    </div>
  );
}
