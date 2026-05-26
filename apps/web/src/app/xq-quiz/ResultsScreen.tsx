"use client";

import Link from "next/link";

import type { XQResult } from "@/lib/xq/scoring";

type Props = {
  result: XQResult;
  /** Inline submit status — surfaces "sending…", "sent ✓", or error
   *  from the API POST. Same pattern the RQ ResultsScreen uses. */
  submitStatus:
    | { type: "idle" | "submitting" }
    | { type: "success"; message: string }
    | { type: "error"; message: string };
};

const SECTION_DEFS = [
  {
    key: "nonNegotiables" as const,
    label: "🔴 Non-Negotiable Guardrails (Revenue Friction Boundaries)",
    tintClass: "nn",
    emptyText: "No restrictive boundary values triggered under pressure.",
  },
  {
    key: "core" as const,
    label: "🔹 Core Operating Framework (Active Lived Realities)",
    tintClass: "core",
    emptyText: "No baseline habits checked.",
  },
  {
    key: "aspirational" as const,
    label: "🔮 Aspirational Horizons (Intended Trajectories)",
    tintClass: "asp",
    emptyText: "No growth parameters marked.",
  },
  {
    key: "background" as const,
    label: "💡 Background Context Nuances",
    tintClass: "bg",
    emptyText: "None — every selected value landed in another bucket.",
  },
];

/**
 * Final XQ dossier screen — archetype hero + the four-bucket value
 * blueprint + an inline submit-status banner that reports whether the
 * server-side persist + emails went through.
 */
export function ResultsScreen({ result, submitStatus }: Props) {
  return (
    <>
      <div className="xq-result-hero">
        <div className="xq-result-tag">Calibration Architecture Verified</div>
        <h1 className="xq-result-name">{result.archetype.name}</h1>
        <p className="xq-result-tagline">&ldquo;{result.archetype.tagline}&rdquo;</p>
      </div>

      <p className="xq-result-desc">{result.archetype.desc}</p>

      <div className="xq-result-bias">
        <strong>Triangulated Vector Bias</strong> · {result.vectorBias}
      </div>

      <h2 className="xq-result-section-title">
        Your Triangulated Conviction Dossier
      </h2>

      {SECTION_DEFS.map(({ key, label, tintClass, emptyText }) => {
        const items = result.buckets[key];
        return (
          <div key={key} className="xq-bucket">
            <strong className={`xq-bucket-label ${tintClass}`}>{label}</strong>
            <div>
              {items.length === 0 ? (
                <span className="xq-result-empty">{emptyText}</span>
              ) : (
                items.map((v) => (
                  <span key={v} className={`xq-tag ${tintClass}`}>
                    {v}
                  </span>
                ))
              )}
            </div>
          </div>
        );
      })}

      {submitStatus.type === "submitting" && (
        <div className="xq-submit-status success" style={{ background: "rgba(255,255,255,0.04)", color: "var(--xq-muted)", borderColor: "var(--xq-line-soft)" }}>
          Saving your dossier and sending you a copy by email…
        </div>
      )}
      {submitStatus.type === "success" && (
        <div className="xq-submit-status success" role="status">
          {submitStatus.message}
        </div>
      )}
      {submitStatus.type === "error" && (
        <div className="xq-submit-status error" role="alert">
          {submitStatus.message}
        </div>
      )}

      <div style={{ marginTop: 30, padding: 22, background: "linear-gradient(135deg, var(--xq-accent-soft), rgba(0,0,0,0))", border: "1px solid var(--xq-line)", borderRadius: 12 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "var(--xq-text)" }}>
          Your convictions are mapped. How does your signal communicate them?
        </h3>
        <p style={{ fontSize: 13.5, color: "var(--xq-muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
          The Resonance Quotient (RQ) is the next layer — it measures how your
          convictions actually project trust, handle market friction, and
          connect with partners. It&apos;s the bridge into the matching matrix.
        </p>
        <Link href="/rq-quiz" className="xq-btn" style={{ marginTop: 0, display: "inline-block", textDecoration: "none" }}>
          Unlock Your Resonance Quotient (RQ) →
        </Link>
      </div>
    </>
  );
}
