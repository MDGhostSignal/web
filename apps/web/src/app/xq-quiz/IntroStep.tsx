"use client";

type Props = {
  onBegin: () => void;
};

/**
 * XQ quiz welcome screen — first thing the user sees at /xq-quiz.
 * Mirrors the RQ IntroStep in spirit (centered hero, brand wordmark
 * inline, short lede, click-to-begin CTA) but with XQ-specific copy.
 */
export function IntroStep({ onBegin }: Props) {
  return (
    <section className="xq-intro">
      <div className="xq-result-tag">The Conviction Quotient</div>
      <h1>
        Welcome to the{" "}
        <span className="gs-brand">
          <span className="gs-brand-ghost">GHOST</span>
          <span className="gs-brand-signal">Signal</span>
        </span>
        <br />
        Conviction Quotient
      </h1>

      <p className="xq-intro-sub">
        An advanced psychometric audit of the strategic convictions and
        lived business values driving your work.
      </p>

      <p className="xq-intro-summary">
        The Conviction Quotient (XQ) is a three-phase diagnostic. Phase 1
        triangulates your operating archetype across continuity-vs-change,
        person-vs-system, and craft-vs-leverage. Phase 2 surfaces the 14
        core values shaping your decisions. Phase 3 stress-tests those
        values to separate non-negotiable guardrails from aspirational
        horizons.
      </p>

      <p className="xq-intro-summary">
        Together with the Resonance Quotient (RQ), the XQ powers the{" "}
        <span className="gs-brand">
          <span className="gs-brand-ghost">GHOST</span>
          <span className="gs-brand-signal">Signal</span>
        </span>{" "}
        matching matrix — pairing creators and brands whose convictions
        actually align.
      </p>

      <button type="button" className="xq-btn" onClick={onBegin}>
        Begin Conviction Quotient →
      </button>
    </section>
  );
}
