/**
 * Artisan Reformer (X-P-C) — Subversive Creator.
 *
 * Visual brief: Standing figure with a brush raised mid-stroke, a
 * cracked mold or template at their feet. Subversive but soulful —
 * they're making something better, not destroying.
 *
 * Compositional anchors:
 *   - Standing relaxed, slight contrapposto (weight on one leg)
 *   - Right hand raised with a paintbrush, mid-stroke
 *   - A short trail of brush-stroke marks in the upper right
 *   - At the feet: a broken mold (two halves of a vessel) — subtle,
 *     not destructive, just discarded
 *   - A small palette/jar held in the left hand at the waist
 */

import { Frame, Head } from "./_shared";

export function ArtisanReformerCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Brush-stroke marks in the upper right — three curved gestures
          showing the trail of their work. Strokes appear in sequence
          and fade, looping endlessly — the character is always
          mid-creation. */}
      <g opacity={0.75} strokeWidth={2.2}>
        <path className="xq-anim-artisan-stroke" data-i="0" d="M 158 38 Q 180 28 196 36" />
        <path className="xq-anim-artisan-stroke" data-i="1" d="M 168 56 Q 188 52 200 62" />
        <path className="xq-anim-artisan-stroke" data-i="2" d="M 178 78 Q 196 76 206 86" />
      </g>

      {/* Head */}
      <Head cx={108} cy={64} r={15} />

      {/* Casual collar — thinner background */}
      <path d="M 94 78 L 122 78" opacity={0.5} strokeWidth={1.4} />

      {/* Torso — heavier silhouette, asymmetric contrapposto */}
      <path
        d="M 88 88 C 86 110, 90 130, 92 152 L 128 152 C 130 130, 134 110, 128 88 Z"
        strokeWidth={2.2}
      />

      {/* Apron line — thinner diagonal background hint */}
      <path
        d="M 90 100 L 130 130"
        opacity={0.4}
        strokeDasharray="2 3"
        strokeWidth={1.2}
      />

      {/* Hip line */}
      <path d="M 92 152 L 128 152" opacity={0.55} strokeWidth={1.4} />

      {/* Ink-pool dots at shoulder joints */}
      <circle cx={88} cy={90} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={128} cy={90} r={1.6} fill="currentColor" stroke="none" />

      {/* Right arm — raised, holding the brush mid-stroke */}
      <path d="M 128 92 C 138 78, 144 60, 148 44" />

      {/* Paintbrush — proper anatomy. Tapered wooden handle, a
          metal ferrule band, then a clear bristle tuft fanning at
          the tip. Oriented up-right from the right hand. */}
      <g>
        {/* Handle — tapered quadrilateral from grip to ferrule */}
        <path
          d="M 145 47 L 150 43 L 161 26 L 156 23 Z"
          fill="currentColor"
          fillOpacity={0.18}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        {/* Ferrule — metal band at the bristle end, filled darker */}
        <path
          d="M 156 23 L 161 26 L 168 22 L 163 19 Z"
          fill="currentColor"
          fillOpacity={0.7}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* Bristle tuft — soft tapered fan from the ferrule */}
        <path
          d="M 163 19 L 168 22 L 175 14 L 173 10 L 168 10 L 163 14 Z"
          fill="currentColor"
          fillOpacity={0.45}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        {/* Bristle separation lines for texture */}
        <path d="M 166 16 L 170 12" strokeWidth={1} opacity={0.7} />
        <path d="M 168 18 L 172 14" strokeWidth={1} opacity={0.5} />
      </g>

      {/* Ink-pool dot where brush meets hand */}
      <circle cx={148} cy={47} r={1.6} fill="currentColor" stroke="none" />

      {/* Left arm — holding a painter's palette at the waist */}
      <path d="M 88 92 C 78 116, 76 140, 80 156" />

      {/* Painter's palette — classic kidney shape with a thumb
          hole on the left and three dabs of paint on the surface.
          Held flat against the left hip. */}
      <g>
        {/* Palette outline — flat kidney */}
        <path
          d="M 52 158 Q 50 150, 60 146 L 80 146 Q 92 148, 92 158 Q 92 170, 80 171 L 64 171 Q 52 168, 52 158 Z"
          strokeWidth={2.2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.12}
        />
        {/* Thumb hole — open circle near the grip side */}
        <circle cx={60} cy={158} r={3} strokeWidth={1.8} />
        {/* Paint dabs — three filled dots arranged on the working
            surface, varying opacity for paint volume */}
        <circle cx={74} cy={154} r={2.2} fill="currentColor" stroke="none" />
        <circle cx={84} cy={156} r={1.8} fill="currentColor" stroke="none" opacity={0.75} />
        <circle cx={78} cy={163} r={1.6} fill="currentColor" stroke="none" opacity={0.55} />
      </g>

      {/* Ink-pool dot where left hand holds the palette edge */}
      <circle cx={82} cy={146} r={1.4} fill="currentColor" stroke="none" />

      {/* Contrapposto legs — weight on right (figure's right, viewer's
          left); left leg relaxed and forward */}
      <path d="M 100 152 C 96 180, 96 210, 100 248" />
      <path d="M 120 152 C 124 180, 130 210, 134 248" />

      {/* Broken mold at the feet — two halves of a vessel on the
          ground, discarded but not destroyed */}
      <g opacity={0.65}>
        {/* Left half */}
        <path
          d="M 154 240 C 152 232, 158 224, 168 222 L 168 248 Z"
        />
        {/* Right half */}
        <path
          d="M 196 240 C 198 232, 192 224, 182 222 L 182 248 Z"
        />
        {/* Crack between */}
        <path d="M 172 222 L 178 248" opacity={0.5} strokeDasharray="2 3" />
      </g>

      {/* Ground baseline */}
      <path d="M 32 256 Q 120 262 220 256" opacity={0.4} />
      <path
        d="M 12 268 Q 120 278 228 268"
        opacity={0.25}
        strokeDasharray="2 4"
      />
    </Frame>
  );
}
