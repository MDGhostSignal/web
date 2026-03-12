"use client";

import { useState } from "react";
import { ScaleQuestion } from "@/components/rq/ScaleQuestion";
import { ChoiceQuestion } from "@/components/rq/ChoiceQuestion";
import { TextInput } from "@/components/rq/TextInput";
import { TextArea } from "@/components/rq/TextArea";
import { computeRQ, computeSignalClarity, type RQAnswers, type RQResult, type SignalClarity } from "@/lib/rq/scoring";
import { BRAND } from "@/lib/rq/constants";
import "./rq-index.css";

type FormState = {
  // Basics
  TYPE: string;
  FIRST: string;
  LAST: string;
  ROLE: string;
  ORG: string;
  INDUSTRY: string;
  WEBSITE: string;
  EMAIL: string;
  // Values Orientation
  VO1: number;
  VO1_NP: boolean;
  VO2: number;
  VO2_NP: boolean;
  VO3: string;
  VO4: string;
  VO5: number;
  VO5_NP: boolean;
  // Authenticity Expression
  AE1: string;
  AE2: number;
  AE2_NP: boolean;
  AE3: string;
  AE4: number;
  AE4_NP: boolean;
  AE5: number;
  AE5_NP: boolean;
  // Flourishing Horizon
  FH1: string;
  FH2: number;
  FH2_NP: boolean;
  FH3: string;
  FH4: string;
  FH5: number;
  FH5_NP: boolean;
  // Undertone
  U1: string;
};

export default function RQIndexPage() {
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
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = (): boolean => {
    // Check required basics
    if (!form.TYPE || !form.FIRST || !form.LAST || !form.ORG || !form.EMAIL) {
      setError("Please fill out all required basic information fields.");
      return false;
    }

    // Check required questions
    if (!form.VO3 || !form.VO4 || !form.AE1 || !form.AE3 || !form.FH1 || !form.FH3 || !form.FH4) {
      setError("Please answer all required questions before generating your RQ.");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    // Count "No preference" responses
    let npCount = 0;
    const totalCount = 15; // 8 sliders + 7 choice questions

    // Sliders
    [form.VO1_NP, form.VO2_NP, form.VO5_NP, form.AE2_NP, form.AE4_NP, form.AE5_NP, form.FH2_NP, form.FH5_NP].forEach(
      (np) => {
        if (np) npCount++;
      },
    );

    // Choice questions
    [form.VO3, form.VO4, form.AE1, form.AE3, form.FH1, form.FH3, form.FH4].forEach((val) => {
      if (val === "No preference") npCount++;
    });

    // Build answers object
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

    // Compute RQ
    const rqResult = computeRQ(answers);
    const signalClarity = computeSignalClarity(npCount, totalCount);

    setResult(rqResult);
    setClarity(signalClarity);

    // Submit to API
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch("/api/rq-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "native-rq-index",
          submittedAt: new Date().toISOString(),
          brand: {
            company: BRAND.company,
            acronym: BRAND.acronym,
            title: BRAND.title,
          },
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
            npCount,
            totalCount,
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
          message: data.emailNotified
            ? "Your RQ has been saved successfully. We've sent you a confirmation email."
            : "Your RQ has been saved successfully.",
        });
      } else {
        throw new Error("Submission failed");
      }
    } catch (err) {
      console.error("Submission error:", err);
      setSubmitStatus({
        type: "error",
        message: "Your RQ was generated, but we couldn't save it. Please try again or contact support.",
      });
    } finally {
      setSubmitting(false);
    }

    // Scroll to results
    setTimeout(() => {
      document.getElementById("rq-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="rq-page">
      <div className="rq-container">
        <header className="rq-header">
          <div>
            <h1 className="rq-title">{BRAND.title}</h1>
            <p className="rq-subtitle">{BRAND.subtitle}</p>
          </div>
          <div className="rq-badge">
            {BRAND.company} • {BRAND.acronym}
          </div>
        </header>

        <div className="rq-divider" />

        <form
          className="rq-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="rq-grid">
            {/* Basics */}
            <section className="rq-section">
              <h3 className="rq-section-title">Basics</h3>
              <ChoiceQuestion
                id="TYPE"
                label="I am a…"
                options={["Creator / Podcaster", "Brand / Advertiser"]}
                value={form.TYPE}
                onChange={(v) => updateForm("TYPE", v)}
              />
              <TextInput
                id="FIRST"
                label="First name"
                placeholder="First name"
                required
                value={form.FIRST}
                onChange={(v) => updateForm("FIRST", v)}
              />
              <TextInput
                id="LAST"
                label="Last name"
                placeholder="Last name"
                required
                value={form.LAST}
                onChange={(v) => updateForm("LAST", v)}
              />
              <TextInput
                id="ROLE"
                label="Role / Title"
                placeholder="Role / Title"
                value={form.ROLE}
                onChange={(v) => updateForm("ROLE", v)}
              />
              <TextInput
                id="ORG"
                label="Organization / Podcast name"
                placeholder="Organization / Podcast"
                required
                value={form.ORG}
                onChange={(v) => updateForm("ORG", v)}
              />
              <TextInput
                id="INDUSTRY"
                label="Industry"
                placeholder="Industry"
                value={form.INDUSTRY}
                onChange={(v) => updateForm("INDUSTRY", v)}
              />
              <TextInput
                id="WEBSITE"
                label="Website"
                placeholder="https://…"
                value={form.WEBSITE}
                onChange={(v) => updateForm("WEBSITE", v)}
              />
              <TextInput
                id="EMAIL"
                label="Email"
                placeholder="name@company.com"
                type="email"
                required
                value={form.EMAIL}
                onChange={(v) => updateForm("EMAIL", v)}
              />
              <div className="rq-help-text">
                We use this to label your report and follow up. We don't sell it. Ever.
              </div>
            </section>

            {/* Values Orientation */}
            <section className="rq-section">
              <h3 className="rq-section-title">Values Orientation</h3>
              <ScaleQuestion
                id="VO1"
                label="How explicitly do you communicate your core values in public-facing messaging?"
                value={form.VO1}
                noPreference={form.VO1_NP}
                onChange={(v) => updateForm("VO1", v)}
                onNoPreferenceChange={(c) => updateForm("VO1_NP", c)}
              />
              <ScaleQuestion
                id="VO2"
                label="How important is it that your audience clearly understands your worldview or moral framework?"
                value={form.VO2}
                noPreference={form.VO2_NP}
                onChange={(v) => updateForm("VO2", v)}
                onNoPreferenceChange={(c) => updateForm("VO2_NP", c)}
              />
              <ChoiceQuestion
                id="VO3"
                label="Have you ever declined revenue or an opportunity because it conflicted with your values?"
                options={["Yes", "No"]}
                allowNoPreference
                value={form.VO3}
                onChange={(v) => updateForm("VO3", v)}
              />
              <ChoiceQuestion
                id="VO4"
                label="When you describe your mission, it is usually…"
                options={[
                  "A clearly stated \"why\" we return to often (Formative)",
                  "Mostly expressed through tone, behavior, and outcomes (Implicit)",
                ]}
                allowNoPreference
                value={form.VO4}
                onChange={(v) => updateForm("VO4", v)}
              />
              <ScaleQuestion
                id="VO5"
                label="I'm comfortable being clearly identified with a set of convictions, even if it narrows the audience."
                value={form.VO5}
                noPreference={form.VO5_NP}
                onChange={(v) => updateForm("VO5", v)}
                onNoPreferenceChange={(c) => updateForm("VO5_NP", c)}
              />
            </section>

            {/* Authenticity Expression */}
            <section className="rq-section">
              <h3 className="rq-section-title">Authenticity Expression</h3>
              <ChoiceQuestion
                id="AE1"
                label="When explaining what you stand for, what feels most natural?"
                options={[
                  "Story, lived experience, testimony (Relational)",
                  "Framing, principles, reasoning, clarity (Structural)",
                ]}
                allowNoPreference
                value={form.AE1}
                onChange={(v) => updateForm("AE1", v)}
              />
              <ScaleQuestion
                id="AE2"
                label="Our voice is primarily… (1=personal/conversational, 10=structured/intentional)"
                value={form.AE2}
                noPreference={form.AE2_NP}
                onChange={(v) => updateForm("AE2", v)}
                onNoPreferenceChange={(c) => updateForm("AE2_NP", c)}
              />
              <ChoiceQuestion
                id="AE3"
                label="A partnership message feels most authentic when it is…"
                options={[
                  "Woven into narrative and conversation (Relational)",
                  "Clearly defined, concise, and well-framed (Structural)",
                ]}
                allowNoPreference
                value={form.AE3}
                onChange={(v) => updateForm("AE3", v)}
              />
              <ScaleQuestion
                id="AE4"
                label="How important is tonal consistency across your content or brand?"
                value={form.AE4}
                noPreference={form.AE4_NP}
                onChange={(v) => updateForm("AE4", v)}
                onNoPreferenceChange={(c) => updateForm("AE4_NP", c)}
              />
              <ScaleQuestion
                id="AE5"
                label="If an endorsement disrupted your usual tone, how uncomfortable would that feel?"
                value={form.AE5}
                noPreference={form.AE5_NP}
                onChange={(v) => updateForm("AE5", v)}
                onNoPreferenceChange={(c) => updateForm("AE5_NP", c)}
              />
            </section>

            {/* Flourishing Horizon */}
            <section className="rq-section">
              <h3 className="rq-section-title">Flourishing Horizon</h3>
              <ChoiceQuestion
                id="FH1"
                label="Partnerships should develop…"
                options={[
                  "Slowly over time, trust first (Long-Arc)",
                  "Quickly with clear goals and momentum (Catalytic)",
                ]}
                allowNoPreference
                value={form.FH1}
                onChange={(v) => updateForm("FH1", v)}
              />
              <ScaleQuestion
                id="FH2"
                label="How important is long-term continuity vs short-term impact? (1=short-term, 10=long-term)"
                value={form.FH2}
                noPreference={form.FH2_NP}
                onChange={(v) => updateForm("FH2", v)}
                onNoPreferenceChange={(c) => updateForm("FH2_NP", c)}
              />
              <ChoiceQuestion
                id="FH3"
                label="I prefer…"
                options={[
                  "Fewer partnerships that last longer (Long-Arc)",
                  "More partnerships that run in seasons (Catalytic)",
                ]}
                allowNoPreference
                value={form.FH3}
                onChange={(v) => updateForm("FH3", v)}
              />
              <ChoiceQuestion
                id="FH4"
                label="Success in collaboration looks like…"
                options={[
                  "Depth, durability, shared legacy (Long-Arc)",
                  "Activation, lift, measurable outcomes (Catalytic)",
                ]}
                allowNoPreference
                value={form.FH4}
                onChange={(v) => updateForm("FH4", v)}
              />
              <ScaleQuestion
                id="FH5"
                label="How patient are you with slower growth if alignment is strong?"
                value={form.FH5}
                noPreference={form.FH5_NP}
                onChange={(v) => updateForm("FH5", v)}
                onNoPreferenceChange={(c) => updateForm("FH5_NP", c)}
              />
            </section>

            {/* Undertone */}
            <section className="rq-section">
              <h3 className="rq-section-title">Undertone</h3>
              <TextArea
                id="U1"
                label="Anything we should know that no index could capture? (optional)"
                placeholder=""
                rows={8}
                value={form.U1}
                onChange={(v) => updateForm("U1", v)}
                helpText="Your RQ is a tuning tool—clarity, not a box."
              />
            </section>
          </div>

          {error && <div className="rq-error">{error}</div>}
          {submitStatus && <div className={`rq-status rq-status-${submitStatus.type}`}>{submitStatus.message}</div>}

          <div className="rq-actions">
            <button type="submit" className="rq-button rq-button-primary" disabled={submitting}>
              {submitting ? "Saving..." : BRAND.cta}
            </button>
          </div>
        </form>

        {result && clarity && (
          <div id="rq-results" className="rq-results">
            <h2 className="rq-results-title">Your {BRAND.acronym}</h2>
            <div className="rq-code">
              {BRAND.acronym}: {result.rq}
            </div>
            <div className="rq-name">Name: {result.rqName}</div>

            <div className="rq-profile">
              <p>{result.profile.values}</p>
              <p>{result.profile.authenticity}</p>
              <p>{result.profile.horizon}</p>
            </div>

            <div className="rq-meta">
              {form.FIRST} {form.LAST} · {form.TYPE} · {form.ORG}
              {form.ROLE && ` · ${form.ROLE}`}
              {form.INDUSTRY && ` · ${form.INDUSTRY}`}
              {form.WEBSITE && ` · ${form.WEBSITE}`}
              <br />
              Signal Clarity: {clarity.label} — {clarity.note}
              <br />
              Values: {result.details.values.letter} ({result.details.values.score}, band{" "}
              {result.details.values.band}) · Authenticity: {result.details.authenticity.letter} (
              {result.details.authenticity.score}, band {result.details.authenticity.band}) · Horizon:{" "}
              {result.details.horizon.letter} ({result.details.horizon.score}, band{" "}
              {result.details.horizon.band})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
