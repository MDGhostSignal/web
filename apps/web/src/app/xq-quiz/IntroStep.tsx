"use client";

type Props = {
  onBegin: () => void;
};

/**
 * Stacked depth slices form a real extruded body. Each slice is the
 * same "XQ" text translated diagonally by `i * STEP` units toward the
 * bottom-left, filled with a color graded along the depth axis (dark
 * back → mid-tone shoulder → bright front edge). The visible front
 * face is then painted on top with a horizontal gradient running
 * dark-on-left → bright-on-right so the form catches the implied
 * top-right light source.
 */
const SLICE_COUNT = 18;
const SLICE_STEP = 0.55; // viewBox units per slice along the depth axis
const FONT_FAMILY =
  '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif';

function XQ3DWordmark() {
  const slices = Array.from({ length: SLICE_COUNT }, (_, i) => {
    // i=0 is the deepest slice (back), i=SLICE_COUNT-1 is closest to
    // the front face. Color ramps from a deep purple-black up to the
    // mid-tone purple that the front gradient picks up.
    const t = i / (SLICE_COUNT - 1);
    const r = Math.round(40 + (150 - 40) * t);
    const g = Math.round(28 + (130 - 28) * t);
    const b = Math.round(70 + (175 - 70) * t);
    const dx = (SLICE_COUNT - 1 - i) * -SLICE_STEP; // back slices push left
    const dy = (SLICE_COUNT - 1 - i) * SLICE_STEP;  // and down
    return (
      <text
        key={i}
        x="400"
        y="172"
        transform={`translate(${dx} ${dy})`}
        fill={`rgb(${r}, ${g}, ${b})`}
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
      >
        XQ
      </text>
    );
  });

  return (
    <svg
      className="xq-intro-hero-svg"
      viewBox="0 0 800 240"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        {/* Front-face fill — dark on left, bright on right, matching
         * the fog's right-side light source. */}
        <linearGradient id="xq-front-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9a8db5" />
          <stop offset="35%" stopColor="#c3b4dc" />
          <stop offset="70%" stopColor="#ebdcfa" />
          <stop offset="100%" stopColor="#fff5ff" />
        </linearGradient>
        {/* Top-right specular sheen — a brighter band overlaid where
         * the implied light hits hardest. Painted as a second text
         * layer with this gradient so it integrates with the form. */}
        <linearGradient
          id="xq-specular"
          x1="0.5"
          y1="1"
          x2="0.58"
          y2="0"
        >
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
        {/* Soft drop shadow — blurred + offset toward bottom-left so
         * it reads as ambient occlusion rather than a hard cast.
         * Much softer than the previous black drop-shadow stack. */}
        <filter
          id="xq-soft-shadow"
          x="-10%"
          y="-10%"
          width="120%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dx="-2" dy="8" result="shadow" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.32" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Soft ambient shadow underneath */}
      <g filter="url(#xq-soft-shadow)">
        <text
          x="400"
          y="172"
          textAnchor="middle"
          fontSize="220"
          fontFamily={FONT_FAMILY}
          fontWeight={900}
          fontStyle="italic"
          letterSpacing="-10"
          fill="#000"
        >
          XQ
        </text>
      </g>

      {/* Extruded depth slices */}
      {slices}

      {/* Front face with horizontal gradient */}
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#xq-front-fill)"
      >
        XQ
      </text>

      {/* Top-right specular highlight layered on top of the front */}
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#xq-specular)"
      >
        XQ
      </text>

      {/* Chrome shimmer — a tall thin bright band sweeps diagonally
       * across the letter silhouettes on a loop. Clipped to the XQ
       * text shape via `clip-path` so it only appears on the form. */}
      <defs>
        <clipPath id="xq-shimmer-clip">
          <text
            x="400"
            y="172"
            textAnchor="middle"
            fontSize="220"
            fontFamily={FONT_FAMILY}
            fontWeight={900}
            fontStyle="italic"
            letterSpacing="-10"
          >
            XQ
          </text>
        </clipPath>
        <linearGradient id="xq-shimmer-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="42%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="58%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <g clipPath="url(#xq-shimmer-clip)">
        <rect
          x="-200"
          y="-200"
          width="200"
          height="640"
          fill="url(#xq-shimmer-band)"
          transform="rotate(18 -100 120)"
        >
          <animate
            attributeName="x"
            from="-300"
            to="940"
            dur="4.2s"
            repeatCount="indefinite"
          />
        </rect>
      </g>
    </svg>
  );
}

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
      <h1 className="xq-intro-hero" aria-label="The Conviction Quotient">
        <XQ3DWordmark />
        <span className="sr-only">XQ</span>
      </h1>
      <div className="xq-intro-eyebrow">The Conviction Quotient</div>

      <h2 className="xq-intro-sub">
        An advanced psychometric audit of the strategic convictions and
        lived business values driving your work.
      </h2>

      <p className="xq-intro-lede">
        The Conviction Quotient is a three-phase diagnostic.
      </p>

      <ol className="xq-intro-phases" aria-label="Three quiz phases">
        <li className="xq-intro-phase">
          <span className="xq-intro-phase-num" aria-hidden="true">01</span>
          <div className="xq-intro-phase-label">Triangulation</div>
          <p className="xq-intro-phase-body">
            Locates your operating archetype across three axes —
            continuity vs. change, person vs. system, craft vs. leverage.
          </p>
        </li>
        <li className="xq-intro-phase">
          <span className="xq-intro-phase-num" aria-hidden="true">02</span>
          <div className="xq-intro-phase-label">Diagnostic</div>
          <p className="xq-intro-phase-body">
            Surfaces the 14 core values shaping the decisions you
            actually make on the ground.
          </p>
        </li>
        <li className="xq-intro-phase">
          <span className="xq-intro-phase-num" aria-hidden="true">03</span>
          <div className="xq-intro-phase-label">Stress Test</div>
          <p className="xq-intro-phase-body">
            Pressure-tests those values to separate non-negotiable
            guardrails from aspirational horizons.
          </p>
        </li>
      </ol>

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
