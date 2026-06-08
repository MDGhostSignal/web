/**
 * Steward (C-P-C) — 3D constellation.
 *
 * Bowed robed figure cupping a glowing star (the "flame") inside an
 * isometric wireframe lantern. Stars at every joint, constellation
 * lines tracing the silhouette. Robe rendered with parallel depth
 * folds suggesting 3D volume.
 */

import {
  Frame3D,
  Link,
  OrbitalHalo,
  Star,
} from "./_shared3d";

export function Steward3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* === Body constellation === */}
      {/* Joints — head, shoulders, elbows, hands at lantern, hips, feet */}
      {/* Constellation links between joints */}
      <g opacity={0.85}>
        <Link x1={120} y1={56} x2={104} y2={82} />
        <Link x1={120} y1={56} x2={136} y2={82} />
        <Link x1={104} y1={82} x2={100} y2={110} />
        <Link x1={136} y1={82} x2={140} y2={110} />
        <Link x1={100} y1={110} x2={110} y2={138} />
        <Link x1={140} y1={110} x2={130} y2={138} />
        <Link x1={104} y1={82} x2={102} y2={170} dashed opacity={0.5} />
        <Link x1={136} y1={82} x2={138} y2={170} dashed opacity={0.5} />
        <Link x1={102} y1={170} x2={96} y2={246} />
        <Link x1={138} y1={170} x2={144} y2={246} />
      </g>

      {/* Arms — bowed clearly OUTSIDE the robe silhouette so the
          limbs read as distinct from the body. Elbow control points
          pushed wide left/right; arms swoop back inward to the hands
          cupping the lantern. Elbow stars mark the joint bend. */}
      <path
        d="M 104 82 Q 72 110 110 138"
        strokeWidth={1.6}
        opacity={0.9}
        fill="none"
      />
      <path
        d="M 136 82 Q 168 110 130 138"
        strokeWidth={1.6}
        opacity={0.9}
        fill="none"
      />
      <Star cx={80} cy={108} r={1.8} twinkle={4} />
      <Star cx={160} cy={108} r={1.8} twinkle={6} />

      {/* Robe parallel fold lines — depth cue, slightly behind */}
      <g opacity={0.4} strokeWidth={1}>
        <path d="M 102 86 Q 92 160 96 244" strokeDasharray="3 4" />
        <path d="M 138 86 Q 148 160 144 244" strokeDasharray="3 4" />
        <path d="M 120 86 L 120 240" strokeDasharray="1 4" />
      </g>

      {/* Bottom hem ellipse — shows the robe base in isometric view */}
      <ellipse cx={120} cy={250} rx={26} ry={5} opacity={0.55} />

      {/* Joint stars (constellation vertices) */}
      <Star cx={120} cy={56} r={3} twinkle={0} />
      <Star cx={104} cy={82} twinkle={1} />
      <Star cx={136} cy={82} twinkle={2} />
      <Star cx={100} cy={110} twinkle={3} />
      <Star cx={140} cy={110} twinkle={4} />
      <Star cx={110} cy={138} twinkle={5} />
      <Star cx={130} cy={138} twinkle={6} />
      <Star cx={102} cy={170} twinkle={7} />
      <Star cx={138} cy={170} twinkle={2} />
      <Star cx={96} cy={246} twinkle={4} />
      <Star cx={144} cy={246} twinkle={6} />

      {/* Head — circle outline with inner star, sits above the neck.
          Universal warm "guardian" head for the steward. */}
      <circle cx={120} cy={40} r={10} strokeWidth={1.4} />
      <line x1={120} y1={50} x2={120} y2={56} opacity={0.85} />
      <Star cx={120} cy={40} r={1.8} twinkle={3} />

      {/* Hood arc — constellation curve above the head */}
      <path
        d="M 100 50 Q 120 18 140 50"
        opacity={0.55}
        strokeDasharray="2 3"
      />

      {/* === Lantern — isometric wireframe box === */}
      {/* Front face (solid) */}
      <path
        d="M 108 138 L 108 168 L 132 168 L 132 138 Z"
        opacity={0.9}
        strokeWidth={1.6}
      />
      {/* Back face offset up-right, dashed (hidden edges) */}
      <g opacity={0.45} strokeDasharray="2 3">
        <path d="M 116 132 L 116 162 L 140 162 L 140 132 Z" />
      </g>
      {/* Connecting edges front → back */}
      <g opacity={0.55}>
        <line x1={108} y1={138} x2={116} y2={132} />
        <line x1={132} y1={138} x2={140} y2={132} />
        <line x1={132} y1={168} x2={140} y2={162} />
        <line x1={108} y1={168} x2={116} y2={162} strokeDasharray="2 3" />
      </g>
      {/* Lantern handle arc above */}
      <path d="M 112 138 Q 120 124 128 138" opacity={0.75} />

      {/* === Live flame inside lantern — tightened so the entire
          fire + halo stays within the lantern body (x: 108–132,
          y: 138–168). Two overlapping teardrop flame paths pulse
          at desynced intervals (3.2s and 5.1s). */}

      {/* Soft glow halo — stacked filled circles confined to the
          lantern footprint. Largest one pulses with the back flame
          for breath. */}
      <circle
        className="xq-c3d-flame-back"
        cx={120}
        cy={153}
        r={16}
        fill="currentColor"
        opacity={0.08}
        stroke="none"
      />
      <circle cx={120} cy={153} r={12} fill="currentColor" opacity={0.14} stroke="none" />
      <circle cx={120} cy={153} r={9} fill="currentColor" opacity={0.24} stroke="none" />

      {/* Back flame — softer, slower (5.1s), fills the lantern
          vertically without bursting out of the top. */}
      <path
        className="xq-c3d-flame-back"
        d="M 120 166 C 112 156, 113 144, 120 138 C 127 144, 128 156, 120 166 Z"
        fill="currentColor"
        stroke="none"
      />
      {/* Front flame — sharper, brighter, faster (3.2s) */}
      <path
        className="xq-c3d-flame-front"
        d="M 120 164 C 114 156, 116 148, 120 142 C 124 148, 126 156, 120 164 Z"
        fill="currentColor"
        stroke="none"
      />

      {/* Bright white inner core — the hot wick centre */}
      <ellipse
        className="xq-c3d-flame-front"
        cx={120}
        cy={155}
        rx={2}
        ry={5}
        fill="#ffffff"
        opacity={0.9}
        stroke="none"
      />

      {/* Faint outer dashed ring — single, snug to the lantern */}
      <circle cx={120} cy={153} r={18} opacity={0.18} strokeDasharray="2 4" />
    </Frame3D>
  );
}
