"use client";

import { useState } from "react";
import * as React from "react";
import { MorseProgress } from "@/components/rq/MorseProgress";
import { ScaleQuestion } from "@/components/rq/ScaleQuestion";
import { ChoiceQuestion } from "@/components/rq/ChoiceQuestion";
import { TextInput } from "@/components/rq/TextInput";
import { TextArea } from "@/components/rq/TextArea";
import { RQResultsGraph } from "@/components/rq/RQResultsGraph";
import SimpleFog from "./SimpleFog";
import DesertFog from "./DesertFog";
import { SnowAnimation } from "./SnowAnimation";
import { computeRQ, computeSignalClarity, type RQAnswers, type RQResult, type SignalClarity } from "@/lib/rq/scoring";
import { BRAND } from "@/lib/rq/constants";
import "./rq-quiz.css";

type FormState = {
  TYPE: string;
  FIRST: string;
  LAST: string;
  ROLE: string;
  ORG: string;
  INDUSTRY: string;
  WEBSITE: string;
  EMAIL: string;
  VO1: number;
  VO1_NP: boolean;
  VO2: number;
  VO2_NP: boolean;
  VO3: string;
  VO4: string;
  VO5: number;
  VO5_NP: boolean;
  AE1: string;
  AE2: number;
  AE2_NP: boolean;
  AE3: string;
  AE4: number;
  AE4_NP: boolean;
  AE5: number;
  AE5_NP: boolean;
  FH1: string;
  FH2: number;
  FH2_NP: boolean;
  FH3: string;
  FH4: string;
  FH5: number;
  FH5_NP: boolean;
  U1: string;
};

type Step = {
  id: string;
  title: string;
  description?: string;
  fields: Array<{
    type: "text" | "email" | "choice" | "scale" | "textarea";
    id: keyof FormState;
    label: string;
    required?: boolean;
    options?: string[];
    allowNoPreference?: boolean;
    placeholder?: string;
    rows?: number;
    helpText?: string;
  }>;
};

const STEPS: Step[] = [
  {
    id: "intro",
    title: "", // Rendered directly in JSX with styled GhostSignal brand
    description: "Find Your Signal.\nName Your Resonance.",
    fields: [],
  },
  {
    id: "type",
    title: "Let's start with the basics",
    description: "Who are you in this partnership ecosystem?",
    fields: [
      {
        type: "choice",
        id: "TYPE",
        label: "I am a…",
        required: true,
        options: ["Creator / Podcaster", "Brand / Advertiser"],
      },
    ],
  },
  {
    id: "identity",
    title: "Tell us about yourself",
    fields: [
      { type: "text", id: "FIRST", label: "First name", required: true, placeholder: "First name" },
      { type: "text", id: "LAST", label: "Last name", required: true, placeholder: "Last name" },
      { type: "text", id: "ORG", label: "Organization / Podcast name", required: true, placeholder: "Organization name" },
    ],
  },
  {
    id: "contact",
    title: "How can we reach you?",
    fields: [
      { type: "email", id: "EMAIL", label: "Email", required: true, placeholder: "name@company.com", helpText: "We'll send your RQ Index summary to this address." },
      { type: "text", id: "ROLE", label: "Role / Title", placeholder: "Your role" },
      { type: "text", id: "INDUSTRY", label: "Industry", placeholder: "Your industry" },
      { type: "text", id: "WEBSITE", label: "Website", placeholder: "https://…" },
    ],
  },
  {
    id: "values-1",
    title: "Values Orientation",
    description: "How do you express what matters to you?",
    fields: [
      {
        type: "scale",
        id: "VO1",
        label: "How explicitly do you communicate your core values in public-facing messaging?",
      },
    ],
  },
  {
    id: "values-2",
    title: "Values Orientation",
    fields: [
      {
        type: "scale",
        id: "VO2",
        label: "How important is it that your audience clearly understands your worldview or moral framework?",
      },
    ],
  },
  {
    id: "values-3",
    title: "Values Orientation",
    fields: [
      {
        type: "choice",
        id: "VO3",
        label: "Have you ever declined revenue or an opportunity because it conflicted with your values?",
        required: true,
        options: ["Yes", "No"],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "values-4",
    title: "Values Orientation",
    fields: [
      {
        type: "choice",
        id: "VO4",
        label: "When you describe your mission, it is usually…",
        required: true,
        options: [
          'A clearly stated "why" we return to often',
          "Mostly expressed through tone, behavior, and outcomes",
        ],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "values-5",
    title: "Values Orientation",
    fields: [
      {
        type: "scale",
        id: "VO5",
        label: "I'm comfortable being clearly identified with a set of convictions, even if it narrows the audience.",
      },
    ],
  },
  {
    id: "authenticity-1",
    title: "Authenticity Expression",
    description: "How do you build trust and credibility?",
    fields: [
      {
        type: "choice",
        id: "AE1",
        label: "When explaining what you stand for, what feels most natural?",
        required: true,
        options: [
          "Story, lived experience, testimony",
          "Framing, principles, reasoning, clarity",
        ],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "authenticity-2",
    title: "Authenticity Expression",
    fields: [
      {
        type: "scale",
        id: "AE2",
        label: "Our voice is primarily… (1=personal/conversational, 10=structured/intentional)",
      },
    ],
  },
  {
    id: "authenticity-3",
    title: "Authenticity Expression",
    fields: [
      {
        type: "choice",
        id: "AE3",
        label: "A partnership message feels most authentic when it is…",
        required: true,
        options: [
          "Woven into narrative and conversation",
          "Clearly defined, concise, and well-framed",
        ],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "authenticity-4",
    title: "Authenticity Expression",
    fields: [
      {
        type: "scale",
        id: "AE4",
        label: "How important is tonal consistency across your content or brand?",
      },
    ],
  },
  {
    id: "authenticity-5",
    title: "Authenticity Expression",
    fields: [
      {
        type: "scale",
        id: "AE5",
        label: "If an endorsement disrupted your usual tone, how uncomfortable would that feel?",
      },
    ],
  },
  {
    id: "horizon-1",
    title: "Flourishing Horizon",
    description: "What's your timeline for meaningful partnerships?",
    fields: [
      {
        type: "choice",
        id: "FH1",
        label: "Partnerships should develop…",
        required: true,
        options: [
          "Slowly over time, trust first",
          "Quickly with clear goals and momentum",
        ],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "horizon-2",
    title: "Flourishing Horizon",
    fields: [
      {
        type: "scale",
        id: "FH2",
        label: "How important is long-term continuity vs short-term impact? (1=short-term, 10=long-term)",
      },
    ],
  },
  {
    id: "horizon-3",
    title: "Flourishing Horizon",
    fields: [
      {
        type: "choice",
        id: "FH3",
        label: "I prefer…",
        required: true,
        options: [
          "Fewer partnerships that last longer",
          "More partnerships that run in seasons",
        ],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "horizon-4",
    title: "Flourishing Horizon",
    fields: [
      {
        type: "choice",
        id: "FH4",
        label: "Success in collaboration looks like…",
        required: true,
        options: [
          "Depth, durability, shared legacy",
          "Activation, lift, measurable outcomes",
        ],
        allowNoPreference: true,
      },
    ],
  },
  {
    id: "horizon-5",
    title: "Flourishing Horizon",
    fields: [
      {
        type: "scale",
        id: "FH5",
        label: "How patient are you with slower growth if alignment is strong?",
      },
    ],
  },
  {
    id: "undertone",
    title: "Undertone",
    description: "Anything we should know that no index could capture?",
    fields: [
      {
        type: "textarea",
        id: "U1",
        label: "Share anything else that matters",
        rows: 6,
        helpText: "Your RQ is a tuning tool—clarity, not a box.",
      },
    ],
  },
];

export default function RQIndexPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    TYPE: "",
    FIRST: "",
    LAST: "",
    ROLE: "",
    ORG: "",
    INDUSTRY: "",
    WEBSITE: "",
    EMAIL: "",
    VO1: 5,
    VO1_NP: false,
    VO2: 5,
    VO2_NP: false,
    VO3: "",
    VO4: "",
    VO5: 5,
    VO5_NP: false,
    AE1: "",
    AE2: 5,
    AE2_NP: false,
    AE3: "",
    AE4: 5,
    AE4_NP: false,
    AE5: 5,
    AE5_NP: false,
    FH1: "",
    FH2: 5,
    FH2_NP: false,
    FH3: "",
    FH4: "",
    FH5: 5,
    FH5_NP: false,
    U1: "",
  });

  const [result, setResult] = useState<RQResult | null>(null);
  const [clarity, setClarity] = useState<SignalClarity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [statusVisible, setStatusVisible] = useState(true);

  // Fade out status notification after 10 seconds
  React.useEffect(() => {
    if (submitStatus && submitStatus.type === "success") {
      const timer = setTimeout(() => {
        setStatusVisible(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const currentStepData = STEPS[currentStep];
  const isIntroStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const isResultsStep = result !== null;

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    if (isIntroStep) return true;

    const step = STEPS[currentStep];
    for (const field of step.fields) {
      if (field.required) {
        const value = form[field.id];
        if (!value || value === "") return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;

    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canProceed()) {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentStep, form, result, submitting]);

  const handleSubmit = async () => {
    // Count "No preference" from choice questions only
    // (Scale questions now use neutral center position instead)
    let npCount = 0;
    const totalCount = 15;

    [form.VO3, form.VO4, form.AE1, form.AE3, form.FH1, form.FH3, form.FH4].forEach((val) => {
      if (val === "No preference") npCount++;
    });

    const answers: RQAnswers = {
      TYPE: form.TYPE,
      FIRST: form.FIRST,
      LAST: form.LAST,
      ROLE: form.ROLE,
      ORG: form.ORG,
      INDUSTRY: form.INDUSTRY,
      WEBSITE: form.WEBSITE,
      EMAIL: form.EMAIL,
      VO1: form.VO1,
      VO2: form.VO2,
      VO3: form.VO3,
      VO4: form.VO4,
      VO5: form.VO5,
      AE1: form.AE1,
      AE2: form.AE2,
      AE3: form.AE3,
      AE4: form.AE4,
      AE5: form.AE5,
      FH1: form.FH1,
      FH2: form.FH2,
      FH3: form.FH3,
      FH4: form.FH4,
      FH5: form.FH5,
      U1: form.U1,
      npCount,
      totalCount,
    };

    const rqResult = computeRQ(answers);
    const signalClarity = computeSignalClarity(npCount, totalCount);

    setResult(rqResult);
    setClarity(signalClarity);
    setSubmitting(true);

    try {
      const response = await fetch("/api/rq-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "native-rq-index-v2",
          submittedAt: new Date().toISOString(),
          brand: { company: BRAND.company, acronym: BRAND.acronym, title: BRAND.title },
          basics: {
            type: form.TYPE,
            first: form.FIRST,
            last: form.LAST,
            role: form.ROLE,
            org: form.ORG,
            industry: form.INDUSTRY,
            website: form.WEBSITE,
            email: form.EMAIL,
          },
          answers: {
            VO1: form.VO1, VO2: form.VO2, VO3: form.VO3, VO4: form.VO4, VO5: form.VO5,
            AE1: form.AE1, AE2: form.AE2, AE3: form.AE3, AE4: form.AE4, AE5: form.AE5,
            FH1: form.FH1, FH2: form.FH2, FH3: form.FH3, FH4: form.FH4, FH5: form.FH5,
            npCount, totalCount,
          },
          result: {
            rq: rqResult.rq,
            rqName: rqResult.rqName,
            profile: rqResult.profile,
            details: rqResult.details,
            clarity: signalClarity,
            undertone: form.U1,
          },
          meta: {
            pageUrl: window.location.href,
            referrer: document.referrer || "",
            userAgent: navigator.userAgent,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmitStatus({
          type: "success",
          message: "Your RQ Index has been emailed to you.",
        });
      } else {
        throw new Error("Submission failed");
      }
    } catch (err) {
      console.error(err);
      setSubmitStatus({
        type: "error",
        message: "Could not save your results. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: Step["fields"][0]) => {
    const fieldId = field.id as keyof FormState;

    if (field.type === "scale") {
      return (
        <ScaleQuestion
          key={String(fieldId)}
          id={String(fieldId)}
          label={field.label}
          value={form[fieldId] as number}
          onChange={(v) => updateForm(fieldId, v as FormState[typeof fieldId])}
        />
      );
    }

    if (field.type === "choice") {
      return (
        <ChoiceQuestion
          key={String(fieldId)}
          id={String(fieldId)}
          label={field.label}
          options={field.options || []}
          allowNoPreference={field.allowNoPreference}
          value={form[fieldId] as string}
          onChange={(v) => updateForm(fieldId, v as FormState[typeof fieldId])}
        />
      );
    }

    if (field.type === "textarea") {
      return (
        <TextArea
          key={String(fieldId)}
          id={String(fieldId)}
          label={field.label}
          rows={field.rows}
          value={form[fieldId] as string}
          onChange={(v) => updateForm(fieldId, v as FormState[typeof fieldId])}
          helpText={field.helpText}
        />
      );
    }

    return (
      <TextInput
        key={String(fieldId)}
        id={String(fieldId)}
        label={field.label}
        type={field.type === "email" ? "email" : "text"}
        required={field.required}
        placeholder={field.placeholder}
        value={form[fieldId] as string}
        onChange={(v) => updateForm(fieldId, v as FormState[typeof fieldId])}
        helpText={field.helpText}
      />
    );
  };

  if (isResultsStep) {
    return (
      <main className="rq-modern-page rq-results-page">
        <div className="rq-desert-fog-bg" aria-hidden="true">
          <DesertFog />
        </div>
        <div className="rq-modern-container rq-results-container">
          <div className="rq-results-modern">
            <header className="rq-results-header">
              <h1>
                <span className="rq-results-title-line">Your <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span></span>
                <span className="rq-results-title-line">Resonance Quotient</span>
              </h1>
            </header>

            {/* Status notification - fades out after 10 seconds */}
            {submitStatus && statusVisible && (
              <div className={`rq-status-modern rq-status-${submitStatus.type} rq-status-fadeout`}>
                {submitStatus.message}
              </div>
            )}

            {/* RQ Code, Name, Graph and Profile - All in one card */}
            <article className="rq-results-hero">
              <p className="rq-name-display">{result.rqName}</p>
              <p className="rq-code-subtitle">{result.rq}</p>

              {clarity && (
                <div className="rq-clarity">
                  <span className="rq-clarity-label">Signal Clarity:</span>
                  <span className={`rq-clarity-badge rq-clarity-${clarity.label.toLowerCase()}`}>
                    {clarity.label}
                  </span>
                  <p className="rq-clarity-note">{clarity.note}</p>
                </div>
              )}

              {/* Axis Graph Visualization */}
              <RQResultsGraph result={result} />
            </article>

            {/* What Does This Mean For You? */}
            <article className="rq-explanation-section">
              <h2 className="rq-explanation-title">What Does This Mean For You?</h2>

              {/* Axis 1: Values Orientation */}
              <div className="rq-axis-explanation">
                <h3 className="rq-axis-name">
                  Axis 1: Values Orientation
                  <span className={`rq-axis-result ${result.details.values.score <= 3 ? "rq-axis-result-light" : result.details.values.score <= 6 ? "rq-axis-result-balanced" : "rq-axis-result-strong"}`}>
                    You&apos;re {result.details.values.letter === "F" ? "an F" : "an I"} ({result.details.values.score})
                  </span>
                </h3>
                <p className="rq-axis-spectrum">
                  <span className={result.details.values.letter === "F" ? "rq-spectrum-active" : "rq-spectrum-inactive"}>Formative</span>
                  {" ←→ "}
                  <span className={result.details.values.letter === "I" ? "rq-spectrum-active" : "rq-spectrum-inactive"}>Implicit</span>
                </p>
                <p className="rq-axis-description">
                  This axis reflects how your convictions show up in your work.
                </p>
                {result.details.values.letter === "F" ? (
                  <p className="rq-axis-personal">
                    As an <strong>F (Formative)</strong>, your values are named, declared, and actively shaping your message—what you stand for is part of what you say.
                  </p>
                ) : (
                  <p className="rq-axis-personal">
                    As an <strong>I (Implicit)</strong>, your values are lived rather than stated—what you stand for is revealed through tone, choices, and outcomes.
                  </p>
                )}
                <p className="rq-axis-note">
                  Neither is more &ldquo;true&rdquo; than the other. This is about where your signal is most naturally expressed: spoken or embodied, explicit or ambient.
                </p>
              </div>

              {/* Axis 2: Authenticity Expression */}
              <div className="rq-axis-explanation">
                <h3 className="rq-axis-name">
                  Axis 2: Authenticity Expression
                  <span className={`rq-axis-result ${result.details.authenticity.score <= 3 ? "rq-axis-result-light" : result.details.authenticity.score <= 6 ? "rq-axis-result-balanced" : "rq-axis-result-strong"}`}>
                    You&apos;re {result.details.authenticity.letter === "R" ? "an R" : "an S"} ({result.details.authenticity.score})
                  </span>
                </h3>
                <p className="rq-axis-spectrum">
                  <span className={result.details.authenticity.letter === "R" ? "rq-spectrum-active" : "rq-spectrum-inactive"}>Relational</span>
                  {" ←→ "}
                  <span className={result.details.authenticity.letter === "S" ? "rq-spectrum-active" : "rq-spectrum-inactive"}>Structural</span>
                </p>
                <p className="rq-axis-description">
                  This axis captures how your voice carries trust.
                </p>
                {result.details.authenticity.letter === "R" ? (
                  <p className="rq-axis-personal">
                    As an <strong>R (Relational)</strong>, your authenticity flows through story, personality, and lived experience—people trust you because they feel like they know you.
                  </p>
                ) : (
                  <p className="rq-axis-personal">
                    As an <strong>S (Structural)</strong>, your authenticity comes through clarity, consistency, and well-formed ideas—people trust you because your message holds together.
                  </p>
                )}
                <p className="rq-axis-note">
                  This is not a choice between warmth and rigor. It&apos;s about whether your signal lands more through connection or construction, presence or precision.
                </p>
              </div>

              {/* Axis 3: Flourishing Time Horizon */}
              <div className="rq-axis-explanation">
                <h3 className="rq-axis-name">
                  Axis 3: Flourishing Time Horizon
                  <span className={`rq-axis-result ${result.details.horizon.score <= 3 ? "rq-axis-result-light" : result.details.horizon.score <= 6 ? "rq-axis-result-balanced" : "rq-axis-result-strong"}`}>
                    You&apos;re {result.details.horizon.letter === "L" ? "an L" : "a C"} ({result.details.horizon.score})
                  </span>
                </h3>
                <p className="rq-axis-spectrum">
                  <span className={result.details.horizon.letter === "L" ? "rq-spectrum-active" : "rq-spectrum-inactive"}>Long-Arc</span>
                  {" ←→ "}
                  <span className={result.details.horizon.letter === "C" ? "rq-spectrum-active" : "rq-spectrum-inactive"}>Catalytic</span>
                </p>
                <p className="rq-axis-description">
                  This axis reveals how you think about growth, impact, and partnership over time.
                </p>
                {result.details.horizon.letter === "L" ? (
                  <p className="rq-axis-personal">
                    As an <strong>L (Long-Arc)</strong>, you prioritize depth, durability, and relationships that compound slowly—trust is built and protected over time.
                  </p>
                ) : (
                  <p className="rq-axis-personal">
                    As a <strong>C (Catalytic)</strong>, you value momentum, activation, and timely impact—energy is directed toward movement and measurable lift.
                  </p>
                )}
                <p className="rq-axis-note">
                  Both create real value. This axis simply shows whether your signal is oriented toward endurance or ignition, formation or acceleration.
                </p>
              </div>

              {/* What Do Your Numbers Mean? */}
              <div className="rq-numbers-explanation">
                <h3 className="rq-numbers-title">What Do Your Numbers Mean?</h3>
                <p className="rq-numbers-intro">
                  Each letter in your RQ is paired with a number from 1 to 10. This number reflects how strongly that signal shows up in you.
                </p>
                <ul className="rq-numbers-list">
                  <li className="rq-numbers-item-light">
                    <span className="rq-signal-light">Lower numbers (1–3)</span> indicate an <span className="rq-signal-light">ambient signal</span>—present, but flexible. You likely have range here and can move across the spectrum without much friction.
                  </li>
                  <li className="rq-numbers-item-balanced">
                    <span className="rq-signal-balanced">Middle numbers (4–6)</span> suggest a <span className="rq-signal-balanced">balanced signal</span>—you have a clear leaning, but with openness. You can adapt without losing yourself.
                  </li>
                  <li className="rq-numbers-item-strong">
                    <span className="rq-signal-strong">Higher numbers (7–10)</span> indicate an <span className="rq-signal-strong">emphatic signal</span>—this is a defining part of how you operate. Alignment here matters more, and mismatches are easier to feel.
                  </li>
                </ul>
                <p className="rq-numbers-note">
                  This isn&apos;t about better or worse. It&apos;s about clarity and intensity—how loudly or quietly each part of your signal comes through, and how important it is that others meet you there.
                </p>
              </div>

              {/* Your Call Sign */}
              <div className="rq-name-explanation">
                <h3 className="rq-name-title">Your Call Sign: {result.rqName}</h3>
                <p className="rq-name-intro">
                  The three-word name underneath your RQ score is shorthand for your signal.
                </p>
                <p className="rq-name-description">
                  Each word corresponds to one axis of the Resonance Index—Values, Authenticity, and Time Horizon—and reflects both your direction and your strength on that axis. Taken together, they form your &ldquo;call sign&rdquo;: a quick, intuitive way to understand how you interact in partnerships, how you communicate, and how you build.
                </p>
                <p className="rq-name-quote">
                  (It&apos;s not a label to live inside, but a way to recognize yourself—and to help others recognize you—at a glance.)
                </p>
              </div>
            </article>

            {/* CTA Card */}
            <article className="rq-results-cta-card">
              <p className="rq-email-reminder">
                A detailed analysis has been sent to your email.
              </p>

              <hr className="rq-card-divider" />

              {/* Reach out to Mike */}
              <aside className="rq-founder-inline">
                <p className="rq-founder-text">
                  Ready to put your RQ to work?<br />
                  Let&apos;s talk about partnership opportunities.
                </p>
                <a href="mailto:mike@ghostsignal.cloud" className="rq-founder-email">
                  mike@ghostsignal.cloud
                </a>
                <a href="mailto:mike@ghostsignal.cloud" className="rq-founder-card">
                  <img
                    src="/images/brand/GS-EmailSignatures-mikew.gif"
                    alt="Mike Sense - Co-Founder, Vision & Partnerships"
                    className="rq-founder-image"
                  />
                </a>
              </aside>
            </article>

            {/* Snowdrift Section */}
            <aside className="rq-snowdrift-section">
              <div className="rq-snowdrift-snow-bg" aria-hidden="true">
                <SnowAnimation />
              </div>
              <div className="rq-snowdrift-content">
                <img
                  src="/images/brand/snowdrift-logo-white.png"
                  alt="Snowdrift"
                  className="rq-snowdrift-logo-large"
                />
                <p className="rq-snowdrift-description">
                  <span className="rq-snowdrift-tagline">Snowdrift is a <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span> transmission.</span>
                  Thoughts for a community of world makers. A cultural investigation of the future and what it means for you.
                </p>
                <a
                  href="https://snowdriftghostsignal.substack.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rq-cta-btn rq-cta-snowdrift"
                >
                  Subscribe to the Snowdrift Newsletter
                </a>
              </div>
            </aside>

            {/* Discover GhostSignal CTA */}
            <a
              href="https://ghostsignal.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="rq-cta-btn rq-cta-primary rq-cta-standalone"
            >
              Discover <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span>
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="rq-modern-page">
      <MorseProgress currentStep={currentStep + 1} totalSteps={STEPS.length} />

      <div className="rq-modern-container">
        <div className="rq-step-content">
          {isIntroStep ? (
            <section className="rq-intro">
              <div className="rq-intro-liquid-bg" aria-hidden="true">
                <SimpleFog />
              </div>
              <img
                src="/images/brand/brandmark-vert-white.svg"
                alt="GhostSignal"
                className="rq-brand-logo"
              />
              <h1 className="rq-intro-title">
                Welcome<br />
                to the <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span><br />
                Resonance Quotient
              </h1>
              <p className="rq-intro-description">
                {currentStepData.description?.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < (currentStepData.description?.split('\n').length || 0) - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>

              <p className="rq-intro-summary">
                The <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span> Resonance Quotient is a framework for understanding how you signal values,
                build trust, and approach partnerships—helping match creators and brands
                who share aligned visions for world-making.
              </p>

              <details className="rq-intro-extended">
                <summary className="rq-intro-collapsible">
                  <span>The Research Behind the <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span> RQ</span>
                  <span className="rq-profile-toggle" aria-hidden="true"></span>
                </summary>
                <div className="rq-intro-extended-content">
                  <p>
                    The Resonance Quotient draws on decades of research into how shared values
                    create durable, high-trust relationships.
                  </p>
                  <p>
                    Nobel Prize-winning economist Daron Acemoglu&apos;s research demonstrates that
                    &ldquo;high-trust circles&rdquo;—groups bound by shared values—are self-reinforcing:
                    once they exist, they grow and protect themselves, outperforming low-trust
                    systems by orders of magnitude. This deeper trust directly translates to
                    greater revenue, efficiency, and long-term sustainability.
                  </p>
                  <p>
                    In the attention economy, this matters more than ever. When partnerships
                    are built on genuine alignment rather than transactional reach, it creates
                    a deeply human bond—one where every interaction compounds into community
                    that lasts. The RQ doesn&apos;t measure &ldquo;better&rdquo; or &ldquo;worse&rdquo;—it maps your
                    unique position across three axes of partnership resonance, helping you
                    find collaborators who amplify rather than distort your signal.
                  </p>
                  <nav className="rq-intro-links">
                    <a
                      href="https://drive.google.com/file/d/1Jgn7CTqYcfqxxM8d14fjlDfVydsi2up3/view?usp=drive_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rq-intro-link"
                    >
                      Read the <span className="gs-brand"><span className="gs-brand-ghost">GHOST</span><span className="gs-brand-signal">Signal</span></span> White Paper →
                    </a>
                    <a
                      href="https://economics.mit.edu/sites/default/files/2023-04/Culture%2C%20Institutions%20and%20Social%20Equilibria%20-%20A%20Framework.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rq-intro-link"
                    >
                      Acemoglu on High-Trust Equilibria at MIT →
                    </a>
                  </nav>
                </div>
              </details>
            </section>
          ) : (
            <section className="rq-step-section">
              {currentStepData.description && (
                <p className="rq-step-description">{currentStepData.description}</p>
              )}
              <h2 className="rq-step-title">{currentStepData.title}</h2>

              <fieldset className="rq-step-fields">
                <legend className="sr-only">{currentStepData.title}</legend>
                {currentStepData.fields.map(renderField)}
              </fieldset>
            </section>
          )}

          <nav className="rq-nav-buttons" aria-label="Quiz navigation">
            {currentStep > 0 && (
              <button type="button" onClick={handlePrev} className="rq-nav-btn rq-nav-prev">
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || submitting}
              className="rq-nav-btn rq-nav-next"
            >
              {submitting ? "Generating..." : isLastStep ? "Generate My RQ →" : "Continue →"}
            </button>
          </nav>

          <p className="rq-keyboard-hint">
            Press <kbd>Enter</kbd> to continue
          </p>
        </div>
      </div>
    </main>
  );
}
