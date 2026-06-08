/**
 * Institution Builder (C-S-L) — 3D constellation.
 *
 * Standing figure flanked by 3D wireframe colonnade pillars (rendered
 * as isometric rectangular prisms). Architrave beam runs across the
 * top. Scroll held across forearms as a 3D wireframe rolled scroll.
 */

import { Frame3D, Link, OrbitalHalo, Star } from "./_shared3d";

export function InstitutionBuilder3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* Pillars + architrave counter-rotate opposite the figure for
          parallax depth. Wrapping all three architectural pieces in
          one group so they pivot together. */}
      <g className="xq-c3d-counter">

      {/* === Left pillar — isometric rectangular prism === */}
      <g>
        {/* Front face vertical edges */}
        <line x1={24} y1={32} x2={24} y2={232} strokeWidth={1.5} />
        <line x1={42} y1={32} x2={42} y2={232} strokeWidth={1.5} />
        {/* Back face vertical edge (dashed, behind) */}
        <line
          x1={50}
          y1={24}
          x2={50}
          y2={224}
          opacity={0.4}
          strokeDasharray="2 3"
        />
        {/* Capital top — visible front face + perspective receding */}
        <path d="M 18 32 L 48 32 L 56 24 L 26 24 Z" strokeWidth={1.4} />
        <path d="M 48 32 L 56 24" opacity={0.5} />
        {/* Base — same construction */}
        <path d="M 18 232 L 48 232 L 56 224 L 26 224 Z" strokeWidth={1.4} />
      </g>

      {/* === Right pillar — same construction, 2px taller asymmetry === */}
      <g>
        <line x1={198} y1={30} x2={198} y2={232} strokeWidth={1.5} />
        <line x1={216} y1={30} x2={216} y2={232} strokeWidth={1.5} />
        <line
          x1={224}
          y1={22}
          x2={224}
          y2={224}
          opacity={0.4}
          strokeDasharray="2 3"
        />
        <path d="M 192 30 L 222 30 L 230 22 L 200 22 Z" strokeWidth={1.4} />
        <path d="M 222 30 L 230 22" opacity={0.5} />
        <path d="M 192 232 L 222 232 L 230 224 L 200 224 Z" strokeWidth={1.4} />
      </g>

      {/* === Architrave — 3D beam connecting the pillars === */}
      <g>
        <path d="M 24 14 L 216 14 L 224 6 L 32 6 Z" strokeWidth={1.4} opacity={0.85} />
        <line x1={24} y1={14} x2={24} y2={32} opacity={0.85} />
        <line x1={216} y1={14} x2={216} y2={30} opacity={0.85} />
        <line x1={32} y1={6} x2={32} y2={24} opacity={0.4} strokeDasharray="2 3" />
        <line x1={224} y1={6} x2={224} y2={22} opacity={0.4} strokeDasharray="2 3" />
      </g>

      {/* Decorative stars at pillar capitals */}
      <Star cx={32} cy={32} twinkle={1} />
      <Star cx={42} cy={32} twinkle={3} />
      <Star cx={206} cy={30} twinkle={5} />
      <Star cx={216} cy={30} twinkle={7} />

      </g>{/* end counter-rotating architectural group */}

      {/* Head — rounded rectangle, echoes the architectural register
          of the pillars + architrave. Connected to the neck anchor
          via a short spine link. */}
      <rect x={107} y={38} width={26} height={24} rx={5} strokeWidth={1.4} />
      <line x1={120} y1={62} x2={120} y2={66} opacity={0.85} />
      <Star cx={120} cy={50} r={1.8} twinkle={3} />

      {/* === Figure constellation — wide planted stance === */}
      <g opacity={0.85}>
        <Link x1={120} y1={66} x2={100} y2={92} />
        <Link x1={120} y1={66} x2={140} y2={92} />
        <Link x1={100} y1={92} x2={92} y2={138} />
        <Link x1={140} y1={92} x2={148} y2={138} />
        <Link x1={92} y1={138} x2={88} y2={170} />
        <Link x1={148} y1={138} x2={152} y2={170} />
        <Link x1={100} y1={92} x2={140} y2={92} dashed opacity={0.4} />
        <Link x1={88} y1={170} x2={94} y2={246} />
        <Link x1={152} y1={170} x2={146} y2={246} />
      </g>

      <Star cx={120} cy={66} r={3} twinkle={0} />
      <Star cx={100} cy={92} twinkle={2} />
      <Star cx={140} cy={92} twinkle={4} />
      <Star cx={92} cy={138} twinkle={5} />
      <Star cx={148} cy={138} twinkle={6} />
      <Star cx={88} cy={170} twinkle={1} />
      <Star cx={152} cy={170} twinkle={3} />
      <Star cx={94} cy={246} twinkle={7} />
      <Star cx={146} cy={246} twinkle={4} />

      {/* Arms — bowed clearly OUTSIDE the wide planted torso so the
          limbs read as distinct. Elbow control points pushed wide;
          arms swoop back to the hands gripping the scroll edges. */}
      <path
        d="M 100 92 Q 68 130 88 170"
        strokeWidth={1.6}
        opacity={0.9}
        fill="none"
      />
      <path
        d="M 140 92 Q 172 130 152 170"
        strokeWidth={1.6}
        opacity={0.9}
        fill="none"
      />
      <Star cx={76} cy={130} r={1.8} twinkle={5} />
      <Star cx={164} cy={130} r={1.8} twinkle={7} />

      {/* === Unfurled scroll — 3D wireframe banner across forearms.
          Gentle vertical carry suggests the figure is shifting the
          scroll in hand. */}
      <g className="xq-c3d-carry">
        {/* Front face */}
        <rect
          x={72}
          y={168}
          width={96}
          height={32}
          strokeWidth={1.5}
        />
        {/* Back face (offset up-right) — dashed */}
        <rect
          x={80}
          y={162}
          width={96}
          height={32}
          opacity={0.4}
          strokeDasharray="2 3"
        />
        {/* Connecting edges */}
        <g opacity={0.55}>
          <line x1={72} y1={168} x2={80} y2={162} />
          <line x1={168} y1={168} x2={176} y2={162} />
          <line x1={168} y1={200} x2={176} y2={194} />
          <line x1={72} y1={200} x2={80} y2={194} strokeDasharray="2 3" />
        </g>
        {/* Scroll roll ends — ellipses */}
        <ellipse cx={72} cy={184} rx={5} ry={16} opacity={0.85} />
        <ellipse cx={168} cy={184} rx={5} ry={16} opacity={0.85} />

        {/* Blueprint constellation glyph on the scroll */}
        <g opacity={0.6}>
          <Link x1={92} y1={180} x2={132} y2={180} />
          <Link x1={92} y1={188} x2={132} y2={188} />
          <Link x1={92} y1={180} x2={92} y2={188} />
          <Link x1={132} y1={180} x2={132} y2={188} />
          <Star cx={92} cy={180} r={1.6} twinkle={2} />
          <Star cx={132} cy={188} r={1.6} twinkle={4} />
          <Star cx={112} cy={184} r={2} twinkle={6} />
        </g>
      </g>
    </Frame3D>
  );
}
