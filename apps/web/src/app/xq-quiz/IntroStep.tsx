"use client";

import { RQ3DWordmark, XQ3DWordmark } from "./Wordmarks3D";

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
      {/* X and Q — hero headline rendered as inline SVG with stacked
       * depth slices for real extruded 3D, gradient front face for
       * top-right lighting, and SVG filters for a clean soft shadow
       * (replaces the previous CSS background-clip + drop-shadow
       * stack that aliased on subpixel boundaries). */}
      <h1 className="xq-intro-hero" aria-label="Decode Your Signal — The XQ and RQ">
        <XQ3DWordmark />
        <span className="sr-only">XQ</span>
      </h1>
      <div className="xq-intro-eyebrow">Decode Your Signal</div>

      <h2 className="xq-intro-sub">
        Every brand puts out a signal. Is yours crystal clear, or just
        noise?
      </h2>

      <p className="xq-intro-lede">
        At{" "}
        <span className="gs-brand">
          <span className="gs-brand-ghost">GHOST</span>
          <span className="gs-brand-signal">Signal</span>
        </span>
        , we built two connected assessments to map your core convictions
        and turn them into scalable partnerships.
      </p>

      <ol className="xq-intro-phases" aria-label="The XQ and RQ assessments">
        <li className="xq-intro-phase">
          <div className="xq-intro-phase-mark" aria-hidden="true">
            <XQ3DWordmark />
          </div>
          <div className="xq-intro-phase-label">The Values Blueprint</div>
          <p className="xq-intro-phase-body">
            A free audit that uncovers the internal compass of your
            business. Take the assessment and codify your business
            values. The result is a Values Blueprint that gives brands
            and podcasts absolute clarity on their non-negotiables and
            core operating style.
          </p>
        </li>
        <li className="xq-intro-phase">
          <div className="xq-intro-phase-mark" aria-hidden="true">
            <RQ3DWordmark />
          </div>
          <div className="xq-intro-phase-label">Marketplace Matching</div>
          <p className="xq-intro-phase-body">
            <span className="gs-brand">
              <span className="gs-brand-ghost">GHOST</span>
              <span className="gs-brand-signal">Signal</span>
            </span>
            ’s marketplace-matching tool that translates your internal
            identity into aligned partnerships. The bridge that matches
            you with the right brands for revenue-generating campaigns
            you can be proud of.
          </p>
        </li>
      </ol>

      <p className="xq-intro-summary">
        <strong>The XQ maps your brand’s values-DNA.</strong> The RQ
        builds the engine that drives that DNA into great partnership.
        Together they give brands and podcasts a renewed sense of
        purpose, rich clarity, and the data needed for frictionless,
        high-value partnerships.
      </p>

      <button type="button" className="xq-btn" onClick={onBegin}>
        Take the XQ — it’s free →
      </button>
    </section>
  );
}
