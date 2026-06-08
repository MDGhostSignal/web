/**
 * Designer (X-S-C) — Strategic Innovator.
 *
 * Visual brief: Figure at a drafting table, compass and triangle on a
 * precise grid, a single elegant form taking shape. Innovation through
 * restraint, not chaos.
 *
 * Compositional anchors:
 *   - Standing at a tilted drafting board (right side raised)
 *   - One hand on a triangle ruler, the other on a compass
 *   - The board carries a visible grid + a single emerging curve
 *   - Cleaner, more modern silhouette than the Conservator — fewer
 *     robe folds, sharper geometry
 */

import { Frame, Head } from "./_shared";

export function DesignerCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Tilted drafting board — heavier hero outline, squared caps
          for the architectural register */}
      <path
        d="M 80 232 L 80 168 L 220 130 L 220 196 Z"
        strokeWidth={2.4}
        strokeLinecap="square"
      />

      {/* Grid on the board — thinner background hairlines */}
      <g opacity={0.35} strokeWidth={1}>
        <path d="M 100 226 L 100 162" />
        <path d="M 124 220 L 124 156" />
        <path d="M 148 213 L 148 149" />
        <path d="M 172 207 L 172 143" />
        <path d="M 196 200 L 196 137" />
        <path d="M 80 210 L 220 174" />
        <path d="M 80 188 L 220 152" />
        <path d="M 80 198 L 220 162" />
      </g>

      {/* Emerging curve — the single elegant form being drafted.
          Draws itself in over 9s, holds, then resets — endless
          slow drafting motion. */}
      <path
        className="xq-anim-designer-curve"
        d="M 100 200 C 124 178, 158 174, 196 184"
        strokeWidth={2.2}
      />

      {/* Head */}
      <Head cx={62} cy={64} r={15} />

      {/* Torso — clean angular shoulders, standing posture */}
      <path
        d="M 44 88 L 52 84 L 76 84 L 80 88 L 78 152 L 46 152 Z"
      />

      {/* Center seam */}
      <path d="M 62 88 L 62 152" opacity={0.35} strokeDasharray="1 3" />

      {/* Hip line */}
      <path d="M 46 152 L 78 152" opacity={0.5} />

      {/* Legs — standing position behind the drafting board */}
      <path d="M 54 152 C 50 180, 48 210, 52 248" />
      <path d="M 70 152 C 74 180, 76 210, 74 248" />

      {/* Left arm — extended onto the drafting board, hand on the
          triangle ruler */}
      <path d="M 44 96 C 56 124, 76 148, 96 168" />

      {/* Triangle ruler — heavier hero stroke, squared caps. Drifts
          + pivots slowly (7s loop) as if being repositioned.
          Animation class on the path (not the g) because
          transform-box: fill-box doesn't resolve on g elements. */}
      <path
        className="xq-anim-designer-triangle"
        d="M 96 168 L 138 168 L 138 132 Z"
        strokeWidth={2.4}
        strokeLinecap="square"
      />

      {/* Ink-pool dot at hand on triangle */}
      <circle cx={96} cy={168} r={1.4} fill="currentColor" stroke="none" />

      {/* Right arm — extended further, holding the compass */}
      <path d="M 80 96 C 96 116, 124 134, 154 152" />

      {/* Compass — two arms meeting at hinge, planted on the board */}
      <g strokeWidth={2.4}>
        <path d="M 154 152 L 168 130" />
        <path d="M 154 152 L 144 130" />
        <circle cx={156} cy={128} r={2.5} fill="currentColor" stroke="none" />
        <circle cx={154} cy={152} r={1.5} fill="currentColor" stroke="none" opacity={0.7} />
        <circle cx={144} cy={130} r={1.5} fill="currentColor" stroke="none" opacity={0.6} />
      </g>

      {/* Ink-pool dots at shoulder joints */}
      <circle cx={44} cy={90} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={80} cy={90} r={1.6} fill="currentColor" stroke="none" />

      {/* Ground baseline */}
      <path d="M 32 256 L 208 256" opacity={0.4} strokeDasharray="2 4" />
    </Frame>
  );
}
