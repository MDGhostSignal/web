"use client";

import Link from "next/link";

import { XQCharacter } from "@/components/xq/XQCharacter";
import {
  XQSpectrumMap,
  type SpectrumPosition,
} from "@/components/xq/XQSpectrumMap";
import { CHARACTERS } from "@/lib/xq/characters";
import type { XQResult } from "@/lib/xq/scoring";

import { XQCharacter3D } from "@/components/xq/XQCharacter3D";

type Props = {
  result: XQResult;
  /** Inline submit status — surfaces "sending…", "sent ✓", or error
   *  from the API POST. Same pattern the RQ ResultsScreen uses. */
  submitStatus:
    | { type: "idle" | "submitting" }
    | { type: "success"; message: string }
    | { type: "error"; message: string };
  /** Which character renderer to use for the reveal portrait + map
   *  thumbnails. Defaults to "line-art" (XQCharacter). The
   *  /xq-characters2 preview passes "3d" to swap in XQCharacter3D.
   *  String discriminator for RSC serializability. */
  variant?: "line-art" | "3d";
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
 * Convert XQResult.details (per-axis winner letter + raw scores) into
 * the [-1, +1] normalised vector the spectrum map expects.
 *
 * Sign convention matches SpectrumPosition:
 *   axis1: +1 = Continuity (C), -1 = Change     (X)
 *   axis2: +1 = Person     (P), -1 = System     (S)
 *   axis3: +1 = Craft      (C), -1 = Leverage   (L)
 *
 * Strength is `(winning - opposing) / (winning + opposing)` — values
 * land between 0 (dead tie) and 1 (clean sweep). We then flip sign
 * if the winning side is on the negative end of the axis.
 */
function toSpectrumPosition(
  details: XQResult["details"],
): SpectrumPosition {
  const norm = (score: number, opposing: number) => {
    const total = score + opposing;
    return total === 0 ? 0 : (score - opposing) / total;
  };
  const s1 = norm(details.axis1.score, details.axis1.opposingScore);
  const s2 = norm(details.axis2.score, details.axis2.opposingScore);
  const s3 = norm(details.axis3.score, details.axis3.opposingScore);
  return {
    axis1: details.axis1.letter === "C" ? s1 : -s1,
    axis2: details.axis2.letter === "P" ? s2 : -s2,
    axis3: details.axis3.letter === "C" ? s3 : -s3,
  };
}

/**
 * Final XQ dossier screen — character reveal + spectrum map + the
 * four-bucket value blueprint + an inline submit-status banner.
 *
 * The whole screen re-themes to the user's archetype accent through
 * the `--xq-accent` / `--xq-accent-soft` overrides on the wrapper —
 * every tinted detail (hero gradient, taglines, bucket dots) picks up
 * the persona color so the result feels personalised.
 */
export function ResultsScreen({
  result,
  submitStatus,
  variant = "line-art",
}: Props) {
  const identity = CHARACTERS[result.code];
  const position = toSpectrumPosition(result.details);
  const CharacterRenderer = variant === "3d" ? XQCharacter3D : XQCharacter;

  return (
    <div
      className="xq-result-themed"
      style={
        {
          // Per-archetype theming — overrides the surface defaults so
          // the entire dossier picks up the persona's accent.
          ["--xq-accent" as never]: identity.accent,
          ["--xq-accent-soft" as never]: identity.accentSoft,
          ["--xq-line" as never]: identity.accentSoft,
        } as React.CSSProperties
      }
    >
      {/* === Reveal stage — character portrait + title block === */}
      <section className="xq-reveal-stage" aria-labelledby="xq-reveal-name">
        <div className="xq-reveal-portrait-frame">
          <div className="xq-reveal-glow" aria-hidden="true" />
          <div className="xq-reveal-portrait">
            <CharacterRenderer code={result.code} />
          </div>
        </div>
        <div className="xq-reveal-title">
          <div className="xq-reveal-tag">Calibration Architecture Verified</div>
          <div className="xq-reveal-code-chip">{result.code}</div>
          <h1 id="xq-reveal-name" className="xq-reveal-name">
            {result.archetype.name}
          </h1>
          <p className="xq-reveal-tagline">
            &ldquo;{result.archetype.tagline}&rdquo;
          </p>
          <div className="xq-reveal-bias">
            <strong>Triangulated Vector Bias</strong>
            <span className="xq-reveal-bias-value">{result.vectorBias}</span>
          </div>
        </div>
      </section>

      {/* === Description card === */}
      <p className="xq-result-desc">{result.archetype.desc}</p>

      {/* === Spectrum map with user position === */}
      <section className="xq-reveal-map" aria-label="Your position on the XQ spectrum">
        <div className="xq-reveal-map-header">
          <h2 className="xq-reveal-map-title">Where you land on the spectrum</h2>
          <p className="xq-reveal-map-lede">
            The eight archetypes sit on a shared plane. Your white dot
            marks the exact triangulation of your axis scores. Edges
            connect archetypes that share two of three traits — those
            are your closest neighbours.
          </p>
        </div>
        <div className="xq-reveal-map-wrap">
          <XQSpectrumMap
            position={position}
            highlight={result.code}
            variant={variant}
          />
        </div>
      </section>

      {/* === Bucket dossier === */}
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
        <div
          className="xq-submit-status success"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: "var(--xq-muted)",
            borderColor: "var(--xq-line-soft)",
          }}
        >
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

      <div className="xq-reveal-rq-cta">
        <h3>Your convictions are mapped. How does your signal communicate them?</h3>
        <p>
          The Resonance Quotient (RQ) is the next layer — it measures how
          your convictions actually project trust, handle market friction,
          and connect with partners. It&apos;s the bridge into the matching
          matrix.
        </p>
        <Link href="/rq-quiz" className="xq-btn">
          Unlock Your Resonance Quotient (RQ) →
        </Link>
      </div>
    </div>
  );
}
