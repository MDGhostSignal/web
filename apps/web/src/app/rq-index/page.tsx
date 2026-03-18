"use client";

import { useState } from "react";
import * as React from "react";
import { MorseProgress } from "@/components/rq/MorseProgress";
import { ScaleQuestion } from "@/components/rq/ScaleQuestion";
import { ChoiceQuestion } from "@/components/rq/ChoiceQuestion";
import { TextInput } from "@/components/rq/TextInput";
import { TextArea } from "@/components/rq/TextArea";
import SimpleFog from "./SimpleFog";
import { SnowAnimation } from "./SnowAnimation";
import { computeRQ, computeSignalClarity, type RQAnswers, type RQResult, type SignalClarity } from "@/lib/rq/scoring";
import { BRAND } from "@/lib/rq/constants";
import "./rq-index.css";

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
    title: "Welcome\nto the GhostSignal\nResonance Quotient",
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
          'A clearly stated "why" we return to often (Formative)',
          "Mostly expressed through tone, behavior, and outcomes (Implicit)",
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
          "Story, lived experience, testimony (Relational)",
          "Framing, principles, reasoning, clarity (Structural)",
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
          "Woven into narrative and conversation (Relational)",
          "Clearly defined, concise, and well-framed (Structural)",
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
          "Slowly over time, trust first (Long-Arc)",
          "Quickly with clear goals and momentum (Catalytic)",
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
          "Fewer partnerships that last longer (Long-Arc)",
          "More partnerships that run in seasons (Catalytic)",
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
          "Depth, durability, shared legacy (Long-Arc)",
          "Activation, lift, measurable outcomes (Catalytic)",
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
  const [expandedSections, setExpandedSections] = useState<{ values: boolean; authenticity: boolean; horizon: boolean }>({
    values: false,
    authenticity: false,
    horizon: false,
  });
  const [introExpanded, setIntroExpanded] = useState(false);

  const toggleSection = (section: "values" | "authenticity" | "horizon") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
      <div className="rq-modern-page">
        <div className="rq-modern-container">
          <div className="rq-results-modern">
            <div className="rq-results-header">
              <h1>Your GhostSignal Resonance Quotient</h1>
              <p className="rq-email-reminder">
                Check your email inbox to read your full analysis.
              </p>
            </div>

            {/* Status notification - fades out after 10 seconds */}
            {submitStatus && statusVisible && (
              <div className={`rq-status-modern rq-status-${submitStatus.type} rq-status-fadeout`}>
                {submitStatus.message}
              </div>
            )}

            <div className="rq-results-card">
              <div className="rq-code-large">{result.rq}</div>
              <div className="rq-name-large">{result.rqName}</div>

              {clarity && (
                <div className="rq-clarity">
                  <span className="rq-clarity-label">Signal Clarity:</span>
                  <span className={`rq-clarity-badge rq-clarity-${clarity.label.toLowerCase()}`}>
                    {clarity.label}
                  </span>
                  <p className="rq-clarity-note">{clarity.note}</p>
                </div>
              )}
            </div>

            {/* Schedule Call with Mike Section */}
            <div className="rq-founder-cta">
              <p className="rq-founder-text">
                Find out what your RQ can do for you.<br />
                Schedule a call with one of our founders, Mike.
              </p>
              <a href="mailto:mike@ghostsignal.cloud" className="rq-founder-email">
                mike@ghostsignal.cloud
              </a>
              <a href="mailto:mike@ghostsignal.cloud" className="rq-founder-card">
                <img
                  src="/images/brand/GS-EmailSignatures-mikeb.gif"
                  alt="Mike Sense - Co-Founder, Vision & Partnerships"
                  className="rq-founder-image"
                />
              </a>
            </div>

            {/* Snowdrift Section - moved above profile sections */}
            <div className="rq-snowdrift-section">
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
                  <span className="rq-snowdrift-tagline">Snowdrift is a GhostSignal transmission.</span>
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
            </div>

            {/* Discover GhostSignal CTA */}
            <div className="rq-cta-section">
              <a
                href="https://ghostsignal.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="rq-cta-btn rq-cta-primary"
              >
                Discover GhostSignal
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-modern-page">
      <MorseProgress currentStep={currentStep + 1} totalSteps={STEPS.length} />

      <div className="rq-modern-container">
        <div className="rq-step-content">
          {isIntroStep ? (
            <>
              <div className="rq-intro-liquid-bg" aria-hidden="true">
                <SimpleFog />
              </div>
              <div className="rq-intro">
                <div className="rq-intro-content">
                  <img
                    src="/images/brand/brandmark-vert-white.svg"
                    alt="GhostSignal"
                    className="rq-brand-logo"
                  />
                  <h1 className="rq-intro-title">
                    {currentStepData.title.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < currentStepData.title.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h1>
                  <p className="rq-intro-description">
                    {currentStepData.description?.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < (currentStepData.description?.split('\n').length || 0) - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>

                  {/* Brief Summary */}
                  <p className="rq-intro-summary">
                    The Resonance Quotient is a framework for understanding how you signal values,
                    build trust, and approach partnerships—helping match creators and brands
                    who share aligned visions for world-making.
                  </p>

                  {/* Expandable Extended Description */}
                  <div className="rq-intro-extended">
                    <button
                      type="button"
                      className={`rq-intro-collapsible ${introExpanded ? "expanded" : ""}`}
                      onClick={() => setIntroExpanded(!introExpanded)}
                      aria-expanded={introExpanded}
                    >
                      <div className="rq-intro-collapsible-header">
                        <span>The Research Behind the GhostSignal RQ</span>
                        <span className="rq-profile-toggle" aria-hidden="true">
                          {introExpanded ? "−" : "+"}
                        </span>
                      </div>
                      <p className={introExpanded ? "" : "rq-profile-truncated"}>
                        The Resonance Quotient draws on decades of research into how shared values
                        create durable, high-trust relationships.
                      </p>
                      {!introExpanded && (
                        <span className="rq-profile-expand-hint">Tap to expand</span>
                      )}
                    </button>

                    {introExpanded && (
                      <div className="rq-intro-extended-content">
                        <p>
                          Economist Daron Acemoglu&apos;s work demonstrates that &ldquo;high-trust circles&rdquo;—groups
                          bound by shared values—are self-reinforcing: once they exist, they grow and
                          protect themselves, outperforming low-trust systems by orders of magnitude.
                        </p>
                        <p>
                          In the attention economy, this matters more than ever. When partnerships
                          are built on genuine alignment rather than transactional reach, every
                          interaction compounds into community that lasts. The RQ doesn&apos;t measure
                          &ldquo;better&rdquo; or &ldquo;worse&rdquo;—it maps your unique position across three axes of
                          partnership resonance, helping you find collaborators who amplify rather
                          than distort your signal.
                        </p>
                        <div className="rq-intro-links">
                          <a
                            href="#"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rq-intro-link"
                          >
                            Read the GhostSignal White Paper →
                          </a>
                          <a
                            href="#"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rq-intro-link"
                          >
                            Acemoglu on High-Trust Equilibria →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {currentStepData.description && (
                <p className="rq-step-description">{currentStepData.description}</p>
              )}
              <h2 className="rq-step-title">{currentStepData.title}</h2>

              <div className="rq-step-fields">
                {currentStepData.fields.map(renderField)}
              </div>
            </>
          )}

          <div className="rq-nav-buttons">
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
          </div>

          <div className="rq-keyboard-hint">
            Press <kbd>Enter</kbd> to continue
          </div>
        </div>
      </div>
    </div>
  );
}
