"use client";

import { useEffect, useRef, useState } from "react";
import { MorseProgress } from "@/components/rq/MorseProgress";
import { ScaleQuestion } from "@/components/rq/ScaleQuestion";
import { ChoiceQuestion } from "@/components/rq/ChoiceQuestion";
import { TextInput } from "@/components/rq/TextInput";
import { TextArea } from "@/components/rq/TextArea";
import { IntroStep } from "./IntroStep";
import { ResultsScreen } from "./ResultsScreen";
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
      { type: "email", id: "EMAIL", label: "Email", required: true, placeholder: "name@company.com", helpText: "We'll send your RQ Quotient summary to this address." },
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

  // Id of the row inserted when the user finished the contact step
  // (status='incomplete'). On final submit we PATCH this row to flip
  // it to status='complete' instead of inserting a second one. Held
  // in a ref so the fire-and-forget POST below doesn't trigger a
  // re-render race with rapid Continue clicks.
  const incompleteIdRef = useRef<string | null>(null);
  const incompleteRequestedRef = useRef(false);

  // Fade out status notification after 10 seconds
  useEffect(() => {
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

  // Fire-and-forget capture of the lead's contact info as soon as
  // they leave the contact step. Runs at most once per session — if
  // the user goes back and edits, we reuse the same row id when
  // PATCHing on completion. Failures are silent: we never want to
  // block quiz progression on lead capture.
  const captureIncompleteLead = () => {
    if (incompleteRequestedRef.current) return;
    incompleteRequestedRef.current = true;

    void fetch("/api/rq-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "native-rq-index-v2",
        status: "incomplete",
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
        meta: {
          pageUrl: window.location.href,
          referrer: document.referrer || "",
          userAgent: navigator.userAgent,
        },
      }),
    })
      .then(async (r) => {
        if (!r.ok) {
          incompleteRequestedRef.current = false; // allow retry on next step transition
          return;
        }
        const data = (await r.json()) as { id?: string | null };
        if (data?.id) incompleteIdRef.current = String(data.id);
      })
      .catch(() => {
        incompleteRequestedRef.current = false;
      });
  };

  const handleNext = () => {
    if (!canProceed()) return;

    // Trigger lead capture exactly once when the user clicks
    // Continue out of the contact step.
    if (currentStepData.id === "contact") {
      captureIncompleteLead();
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Keyboard navigation — bind once, read latest callbacks via refs so the
  // listener doesn't need to rebind on every render.
  const canProceedRef = useRef(canProceed);
  const handleNextRef = useRef(handleNext);
  canProceedRef.current = canProceed;
  handleNextRef.current = handleNext;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canProceedRef.current()) {
          handleNextRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

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
      const body = JSON.stringify({
        source: "native-rq-index-v2",
        status: "complete",
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
      });

      // If we captured the lead at the contact step, PATCH that same
      // row up to 'complete' so we don't end up with two rows for
      // the same user. Falls back to POST if the lead capture
      // didn't return an id (network failure, direct-jump edge case).
      const incompleteId = incompleteIdRef.current;
      const response = incompleteId
        ? await fetch(`/api/rq-submissions/${incompleteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body,
          })
        : await fetch("/api/rq-submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });

      if (response.ok) {
        await response.json();
        setSubmitStatus({
          type: "success",
          message: "Your RQ Quotient has been emailed to you.",
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
      <ResultsScreen
        result={result!}
        clarity={clarity}
        submitStatus={submitStatus}
        statusVisible={statusVisible}
      />
    );
  }

  return (
    <main className="rq-modern-page">
      <MorseProgress currentStep={currentStep + 1} totalSteps={STEPS.length} />

      <div className="rq-modern-container">
        <div className="rq-step-content">
          {isIntroStep ? (
            <IntroStep description={currentStepData.description} />
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
              {submitting
                ? "Generating..."
                : isLastStep
                  ? "Generate My RQ →"
                  : isIntroStep
                    ? "Start →"
                    : "Continue →"}
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
