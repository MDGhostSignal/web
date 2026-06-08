/**
 * Artisan Reformer (X-P-C) — 3D constellation.
 *
 * Standing figure with a raised paintbrush + a painter's palette at
 * the waist. Brush rendered as a 3D wireframe (tapered handle +
 * ferrule + bristle tuft). Palette as a 3D oval disc with thumb
 * hole + paint-dab stars.
 */

import { Frame3D, GlowStar, Link, OrbitalHalo, Star } from "./_shared3d";

export function ArtisanReformer3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* === Brush-stroke trail in the upper right — three strokes
          appear in sequence (the artisan is mid-creation), each
          fades in and out on stagger. Reuses the original 2D
          rhythm so the gesture reads as ongoing painting. */}
      <g>
        <path
          className="xq-c3d-stroke-pulse"
          data-i="0"
          d="M 158 38 Q 180 28 196 36"
          strokeDasharray="3 4"
          opacity={0.85}
        />
        <path
          className="xq-c3d-stroke-pulse"
          data-i="1"
          d="M 168 56 Q 188 52 200 62"
          strokeDasharray="3 4"
          opacity={0.85}
        />
        <path
          className="xq-c3d-stroke-pulse"
          data-i="2"
          d="M 178 78 Q 196 76 206 86"
          strokeDasharray="3 4"
          opacity={0.85}
        />
        <Star cx={172} cy={36} r={1.6} twinkle={1} />
        <Star cx={186} cy={50} r={1.6} twinkle={3} />
      </g>

      {/* Head — diamond rhombus, off-axis like the figure's
          contrapposto. Reads as creative non-conformity. Connected
          to the neck anchor via a short spine link. */}
      <path d="M 108 24 L 122 40 L 108 56 L 94 40 Z" strokeWidth={1.4} />
      <line x1={108} y1={56} x2={108} y2={56} opacity={0.85} />
      <Star cx={108} cy={40} r={1.8} twinkle={2} />

      {/* === Body constellation — relaxed contrapposto === */}
      <g opacity={0.85}>
        <Link x1={108} y1={56} x2={88} y2={86} />
        <Link x1={108} y1={56} x2={128} y2={86} />
        <Link x1={88} y1={86} x2={80} y2={146} />
        <Link x1={128} y1={86} x2={148} y2={44} />
        <Link x1={88} y1={86} x2={96} y2={156} dashed opacity={0.5} />
        <Link x1={128} y1={86} x2={124} y2={156} dashed opacity={0.5} />
        <Link x1={96} y1={156} x2={100} y2={246} />
        <Link x1={124} y1={156} x2={134} y2={246} />
      </g>

      {/* Joint stars */}
      <Star cx={108} cy={56} r={3} twinkle={0} />
      <Star cx={88} cy={86} twinkle={2} />
      <Star cx={128} cy={86} twinkle={4} />
      <Star cx={80} cy={146} twinkle={5} />
      <Star cx={148} cy={44} twinkle={6} />
      <Star cx={96} cy={156} twinkle={1} />
      <Star cx={124} cy={156} twinkle={3} />
      <Star cx={100} cy={246} twinkle={7} />
      <Star cx={134} cy={246} twinkle={4} />

      {/* === Paintbrush — wrapped in brush-stroke arc animation so
          the hand sweeps the brush back and forth in stroke motion.
          Pivots at the wrist (lower-left of the handle, ~145,47). */}
      <g className="xq-c3d-brush-stroke">
        {/* Handle — tapered quadrilateral */}
        <path
          d="M 145 47 L 150 43 L 161 26 L 156 23 Z"
          strokeWidth={1.5}
        />
        {/* Handle back depth — offset, dashed */}
        <path
          d="M 148 49 L 153 45 L 164 28"
          opacity={0.4}
          strokeDasharray="2 3"
        />
        {/* Ferrule (metal band) */}
        <path
          d="M 156 23 L 161 26 L 168 22 L 163 19 Z"
          strokeWidth={1.5}
        />
        {/* Bristle tuft — wireframe fan */}
        <path
          d="M 163 19 L 168 22 L 175 14 L 173 10 L 168 10 L 163 14 Z"
          strokeWidth={1.5}
        />
        {/* Bristle individual lines */}
        <line x1={166} y1={16} x2={170} y2={12} opacity={0.6} />
        <line x1={168} y1={18} x2={172} y2={14} opacity={0.5} />
        <GlowStar cx={172} cy={12} rCore={1.8} rRing={5} />
      </g>

      {/* === Painter's palette — 3D oval disc === */}
      <g>
        {/* Top ellipse */}
        <ellipse cx={62} cy={156} rx={22} ry={6} strokeWidth={1.5} />
        {/* Bottom edge (slightly below) — shows the disc thickness */}
        <path
          d="M 40 156 Q 40 162 62 162 Q 84 162 84 156"
          opacity={0.6}
        />
        {/* Thumb hole */}
        <circle cx={50} cy={156} r={3} opacity={0.85} />
        {/* Paint dab stars — placed around the palette surface */}
        <Star cx={72} cy={152} r={2.4} twinkle={2} />
        <Star cx={80} cy={156} r={2} twinkle={5} />
        <Star cx={72} cy={161} r={1.8} twinkle={7} />
      </g>

      {/* === Broken mold at feet — wireframe constellation === */}
      <g opacity={0.55}>
        {/* Two half-arc fragments */}
        <path d="M 154 240 C 152 232, 158 224, 168 222" strokeDasharray="2 3" />
        <path d="M 196 240 C 198 232, 192 224, 182 222" strokeDasharray="2 3" />
        <Star cx={154} cy={240} r={1.6} twinkle={6} />
        <Star cx={168} cy={222} r={1.6} twinkle={2} />
        <Star cx={182} cy={222} r={1.6} twinkle={4} />
        <Star cx={196} cy={240} r={1.6} twinkle={0} />
      </g>
    </Frame3D>
  );
}
