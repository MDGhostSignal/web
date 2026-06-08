/**
 * Institution Builder (C-S-L) — Legacy Architect.
 *
 * Visual brief: Standing figure holding an unfurled scroll-blueprint,
 * a colonnade of pillars rising behind. Monumental scale, grounded
 * stance, decades-thinking gaze.
 *
 * Compositional anchors:
 *   - Three classical pillars rising behind the figure (architecture
 *     of permanence)
 *   - Unfurled scroll held horizontally across both forearms
 *   - Wide, planted stance — feet shoulder-width
 *   - The scroll carries a faint blueprint glyph (rectangles + grid)
 */

import { Frame, GroundArc, Head } from "./_shared";

export function InstitutionBuilderCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Three pillars behind — squared linecaps for the architectural
          register; capitals + bases get a heavier hero stroke. Slight
          asymmetry: right pillar 2px taller (organic imperfection). */}
      <g opacity={0.55} strokeLinecap="square">
        {/* Left pillar — capitals breathe in sequence */}
        <path d="M 30 32 L 30 232" />
        <path className="xq-anim-institution-capital" data-i="0" d="M 26 32 L 42 32" strokeWidth={2.4} />
        <path d="M 22 36 L 46 36" strokeWidth={1.4} />
        <path className="xq-anim-institution-capital" data-i="1" d="M 26 232 L 42 232" strokeWidth={2.4} />
        <path d="M 22 228 L 46 228" strokeWidth={1.4} />
        {/* Center-back pillar (smaller, further back) */}
        <path d="M 120 22 L 120 36" opacity={0.5} strokeWidth={1.4} />
        <path d="M 116 22 L 124 22" opacity={0.5} strokeWidth={1.4} />
        {/* Right pillar — 2px taller for organic asymmetry */}
        <path d="M 210 30 L 210 232" />
        <path className="xq-anim-institution-capital" data-i="2" d="M 202 30 L 218 30" strokeWidth={2.4} />
        <path d="M 198 34 L 222 34" strokeWidth={1.4} />
        <path className="xq-anim-institution-capital" data-i="3" d="M 202 232 L 218 232" strokeWidth={2.4} />
        <path d="M 198 228 L 222 228" strokeWidth={1.4} />
        {/* Ink-pool dots at pillar capital corners */}
        <circle cx={26} cy={32} r={1.4} fill="currentColor" stroke="none" />
        <circle cx={42} cy={32} r={1.4} fill="currentColor" stroke="none" />
        <circle cx={202} cy={30} r={1.4} fill="currentColor" stroke="none" />
        <circle cx={218} cy={30} r={1.4} fill="currentColor" stroke="none" />
      </g>

      {/* Architrave — horizontal beam, squared caps */}
      <g opacity={0.45} strokeLinecap="square" strokeWidth={1.6}>
        <path d="M 30 32 L 210 32" />
        <path d="M 30 22 L 210 22" />
        <path d="M 30 22 L 30 32" />
        <path d="M 210 22 L 210 32" />
      </g>

      {/* Head */}
      <Head cx={120} cy={68} r={15} />

      {/* Shoulders + upper torso — wide, planted, heavier silhouette */}
      <path
        d="M 96 92 L 108 86 L 132 86 L 144 92 L 142 148 L 98 148 Z"
        strokeWidth={2.2}
        strokeLinecap="square"
      />

      {/* Ink-pool dots at the broad shoulder joints */}
      <circle cx={96} cy={92} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={144} cy={92} r={1.6} fill="currentColor" stroke="none" />

      {/* Center seam — formal collar, thinner */}
      <path d="M 120 92 L 120 148" opacity={0.4} strokeDasharray="1 3" strokeWidth={1.2} />
      <path d="M 108 100 L 132 100" opacity={0.4} strokeWidth={1.2} />

      {/* Hip belt — squared caps */}
      <path d="M 98 148 L 142 148" opacity={0.6} strokeWidth={1.6} strokeLinecap="square" />

      {/* Wide planted legs — slight outward angle */}
      <path d="M 104 148 L 96 248" />
      <path d="M 136 148 L 144 248" />

      {/* Both arms forward, holding the scroll horizontally */}
      <path d="M 96 96 C 84 124, 80 152, 88 170" />
      <path d="M 144 96 C 156 124, 160 152, 152 170" />

      {/* Unfurled scroll — heavier hero stroke (2.4), squared caps */}
      <g strokeWidth={2.4} strokeLinecap="square">
        {/* Scroll body */}
        <path
          d="M 72 168 L 168 168 L 168 200 L 72 200 Z"
        />
        {/* Scroll end rolls — small ellipses at each side */}
        <ellipse cx={72} cy={184} rx={6} ry={18} />
        <ellipse cx={168} cy={184} rx={6} ry={18} />
      </g>

      {/* Ink-pool dots where hands grip the scroll */}
      <circle cx={88} cy={170} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={152} cy={170} r={1.4} fill="currentColor" stroke="none" />

      {/* Blueprint glyph on the scroll — faint architectural plan */}
      <g opacity={0.5}>
        {/* Outer rectangle */}
        <path d="M 88 176 L 152 176 L 152 192 L 88 192 Z" />
        {/* Inner room divisions */}
        <path d="M 108 176 L 108 192" opacity={0.7} />
        <path d="M 132 176 L 132 192" opacity={0.7} />
        <path d="M 88 184 L 152 184" opacity={0.5} />
      </g>

      {/* Scan line — vertical sweep across the blueprint, like a
          planner verifying a measurement. Translates within the
          scroll bounds; fades at edges (6.5s loop). */}
      <line
        className="xq-anim-institution-scan"
        x1={120}
        y1={172}
        x2={120}
        y2={196}
        stroke="currentColor"
        strokeWidth={1.4}
        opacity={0}
      />

      {/* Room markers — three dots, one per room on the blueprint,
          pulse in sequence as the planner verifies each space. */}
      <circle className="xq-anim-institution-marker" data-i="0" cx={98} cy={184} r={1.8} fill="currentColor" stroke="none" />
      <circle className="xq-anim-institution-marker" data-i="1" cx={120} cy={184} r={1.8} fill="currentColor" stroke="none" />
      <circle className="xq-anim-institution-marker" data-i="2" cx={142} cy={184} r={1.8} fill="currentColor" stroke="none" />

      <GroundArc />
      <path
        d="M 12 268 Q 120 278 228 268"
        opacity={0.25}
        strokeDasharray="2 4"
      />
    </Frame>
  );
}
