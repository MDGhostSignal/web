/**
 * Conservator (C-S-C) — 3D constellation.
 *
 * Libra-inspired register — seated craftsman bent over an isometric
 * wireframe desk with an open ledger and a compass. Desk drawn as a
 * full 3D box with back edges visible as dashed lines.
 */

import { Frame3D, Link, OrbitalHalo, Star } from "./_shared3d";

export function Conservator3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* === Desk — isometric wireframe box. Counter-rotates opposite
          the figure for parallax depth. */}
      <g className="xq-c3d-counter">
        {/* Front face top edge */}
        <line x1={32} y1={178} x2={208} y2={178} strokeWidth={1.8} />
        {/* Front face bottom edge */}
        <line x1={32} y1={226} x2={208} y2={226} />
        {/* Front side legs */}
        <line x1={32} y1={178} x2={32} y2={226} />
        <line x1={208} y1={178} x2={208} y2={226} />
        {/* Back face (offset up-right) — dashed */}
        <g opacity={0.45} strokeDasharray="2 3">
          <line x1={52} y1={166} x2={228} y2={166} />
          <line x1={52} y1={214} x2={228} y2={214} />
          <line x1={52} y1={166} x2={52} y2={214} />
          <line x1={228} y1={166} x2={228} y2={214} />
        </g>
        {/* Connecting edges */}
        <g opacity={0.55}>
          <line x1={32} y1={178} x2={52} y2={166} />
          <line x1={208} y1={178} x2={228} y2={166} />
          <line x1={32} y1={226} x2={52} y2={214} strokeDasharray="2 3" />
          <line x1={208} y1={226} x2={228} y2={214} />
        </g>
      </g>

      {/* === Body — bent forward over the desk === */}
      <g opacity={0.85}>
        <Link x1={114} y1={74} x2={92} y2={108} />
        <Link x1={114} y1={74} x2={138} y2={108} />
        <Link x1={92} y1={108} x2={88} y2={138} />
        <Link x1={138} y1={108} x2={142} y2={138} />
        <Link x1={88} y1={138} x2={100} y2={168} />
        <Link x1={142} y1={138} x2={146} y2={168} />
        <Link x1={92} y1={108} x2={138} y2={108} opacity={0.5} dashed />
        <Link x1={100} y1={168} x2={146} y2={168} opacity={0.5} dashed />
      </g>

      {/* Joint stars */}
      <Star cx={114} cy={74} r={3} twinkle={0} />
      <Star cx={92} cy={108} twinkle={2} />
      <Star cx={138} cy={108} twinkle={4} />
      <Star cx={88} cy={138} twinkle={5} />
      <Star cx={142} cy={138} twinkle={6} />
      <Star cx={100} cy={168} twinkle={1} />
      <Star cx={146} cy={168} twinkle={3} />

      {/* Head — minimal circle outline, sits above the neck anchor.
          Thin line links head → neck to imply the spine. */}
      <circle cx={114} cy={52} r={10} strokeWidth={1.4} />
      <line x1={114} y1={62} x2={114} y2={74} opacity={0.85} />
      <Star cx={114} cy={52} r={1.8} twinkle={5} />

      {/* Arms — bowed clearly OUTSIDE the bent-forward torso so the
          limbs read as distinct. Elbow control points pushed wide;
          arms swoop back to the hands resting on the ledger. */}
      <path
        d="M 92 108 Q 64 142 100 168"
        strokeWidth={1.6}
        opacity={0.9}
        fill="none"
      />
      <path
        d="M 138 108 Q 168 142 146 168"
        strokeWidth={1.6}
        opacity={0.9}
        fill="none"
      />
      <Star cx={72} cy={140} r={1.8} twinkle={2} />
      <Star cx={162} cy={140} r={1.8} twinkle={4} />

      {/* Hood drape arc — kept as a subtle halo behind the head */}
      <path
        d="M 100 64 Q 114 38 128 64"
        opacity={0.4}
        strokeDasharray="2 3"
      />

      {/* === Ledger — small open book wireframe on desk === */}
      <g>
        {/* Open spine line */}
        <line x1={120} y1={170} x2={120} y2={178} opacity={0.85} />
        {/* Left page */}
        <path d="M 88 178 L 96 168 L 120 170 L 120 178 Z" opacity={0.8} />
        {/* Right page */}
        <path d="M 150 178 L 144 168 L 120 170 L 120 178 Z" opacity={0.8} />
        {/* Page line accents (constellation hint) */}
        <g opacity={0.4} strokeDasharray="1 3">
          <line x1={94} y1={172} x2={116} y2={174} />
          <line x1={146} y1={172} x2={124} y2={174} />
        </g>
        <Star cx={120} cy={170} r={2} twinkle={7} />
      </g>

      {/* === Compass — wireframe inverted V === */}
      <g>
        <line x1={144} y1={140} x2={132} y2={170} strokeWidth={1.6} />
        <line x1={144} y1={140} x2={158} y2={170} strokeWidth={1.6} />
        {/* Back arm depth */}
        <line
          x1={147}
          y1={138}
          x2={135}
          y2={168}
          opacity={0.4}
          strokeDasharray="2 3"
        />
        {/* Hinge star */}
        <Star cx={144} cy={140} r={2.6} twinkle={3} />
        <Star cx={132} cy={170} r={1.8} twinkle={5} />
        <Star cx={158} cy={170} r={1.8} twinkle={2} />
        {/* Compass measurement arc — constellation hint */}
        <path
          d="M 132 170 Q 144 178 158 170"
          opacity={0.4}
          strokeDasharray="2 3"
        />
      </g>

      {/* Seated lower body — partial knees beneath the desk */}
      <g opacity={0.55}>
        <line x1={92} y1={226} x2={92} y2={250} strokeDasharray="2 4" />
        <line x1={148} y1={226} x2={148} y2={250} strokeDasharray="2 4" />
        <Star cx={92} cy={250} r={1.8} twinkle={6} />
        <Star cx={148} cy={250} r={1.8} twinkle={4} />
      </g>
    </Frame3D>
  );
}
