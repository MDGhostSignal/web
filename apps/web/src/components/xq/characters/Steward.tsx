/**
 * Steward (C-P-C) — Guardian of Sacred Fire.
 *
 * Visual brief: Robed figure cupping a small flame in a lantern,
 * head bowed slightly in care. Roots/growth rings beneath the feet
 * hint at lineage. Warm, intimate, candle-lit.
 *
 * Compositional anchors:
 *   - Head slightly forward + down (reverent posture)
 *   - Robe falls in two soft curves from shoulders to ground
 *   - Lantern held at chest height with both hands cradling it
 *   - Growth-ring arcs nested beneath the feet
 *   - Flame inside the lantern is the only filled shape — accent glow
 */

import { Frame } from "./_shared";

export function StewardCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Head — bowed forward, asymmetric tilt (3px nudge right) */}
      <circle cx={121} cy={62} r={15} />

      {/* Hooded collar arc — slight asymmetry, right side higher */}
      <path d="M 102 72 Q 121 49 138 73" opacity={0.55} strokeWidth={1.4} />

      {/* Robe — narrower shoulders for the steward register.
          Heavier outer silhouette (2.2). */}
      <path
        d="M 100 84 C 89 132, 81 182, 78 248 L 162 248 C 159 182, 152 130, 140 84"
        strokeWidth={2.2}
      />

      {/* Inner robe seam — thinner background line */}
      <path
        d="M 120 84 L 120 244"
        opacity={0.35}
        strokeDasharray="1 3"
        strokeWidth={1.2}
      />

      {/* Arms — both forward, meeting at the lantern */}
      <path d="M 102 96 C 100 118, 105 132, 112 138" />
      <path d="M 138 96 C 140 118, 135 132, 128 138" />

      {/* Ink-pool dots at shoulder joints (artist's pen-pressure tell) */}
      <circle cx={101} cy={86} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={139} cy={86} r={1.6} fill="currentColor" stroke="none" />

      {/* Lantern body — heavier stroke for the signature prop (2.4),
          squared cap for architectural reading */}
      <path
        d="M 108 138 L 108 168 L 132 168 L 132 138 L 126 132 L 114 132 Z"
        strokeWidth={2.4}
        strokeLinecap="square"
      />

      {/* Lantern handle arc above */}
      <path d="M 112 132 Q 120 122 128 132" strokeWidth={2} />

      {/* Ink-pool dots at hand-grip points on lantern */}
      <circle cx={112} cy={138} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={128} cy={138} r={1.4} fill="currentColor" stroke="none" />

      {/* Lantern crossbars — interior structure */}
      <path d="M 108 152 L 132 152" opacity={0.5} />

      {/* SVG filter for the flame's soft radiant halo. Gaussian
          blur on a duplicated flame path creates the glow effect.
          The filter id is character-scoped to avoid collisions if
          multiple Steward instances render on the same page. */}
      <defs>
        <filter
          id="xq-steward-glow"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      {/* Wide blurred halo — pulses on a slow 7s cycle so it reads
          as a soft radiance independent of the core flame */}
      <path
        className="xq-anim-steward-flame-glow"
        filter="url(#xq-steward-glow)"
        d="M 113 166 C 110 154, 113 142, 120 134 C 127 142, 130 154, 127 166 Z"
        fill="currentColor"
        stroke="none"
      />

      {/* Crisp flame core — filled shape in accent. Slow random
          flicker (5.5s) with no horizontal drift, only vertical
          scaleY + opacity changes for true candle-flame feel. */}
      <path
        className="xq-anim-steward-flame"
        d="M 120 162 C 116 156, 117 150, 120 144 C 123 150, 124 156, 120 162 Z"
        fill="currentColor"
        stroke="none"
      />

      {/* Growth rings beneath — concentric arcs as a stage */}
      <path d="M 78 256 Q 120 264 162 256" opacity={0.6} />
      <path d="M 64 264 Q 120 274 176 264" opacity={0.35} />
      <path
        d="M 50 272 Q 120 282 190 272"
        opacity={0.2}
        strokeDasharray="2 4"
      />
    </Frame>
  );
}
