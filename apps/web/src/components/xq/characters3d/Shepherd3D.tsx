/**
 * Shepherd (C-P-L) — 3D constellation.
 *
 * Sagittarius-inspired silhouette — robed figure holding a tall
 * crosier with a volute curl at the top. A flock of stars gathered
 * at the lower left, connected by constellation lines suggesting a
 * small herd-cluster. Staff rendered with parallel depth lines.
 */

import {
  Frame3D,
  GlowStar,
  Link,
  OrbitalHalo,
  Star,
} from "./_shared3d";

export function Shepherd3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* === Staff — single confident shaft (extra depth lines
          removed; the volute curl is the only thing that needs
          flourish at the top). */}
      <g>
        {/* Main shaft */}
        <line x1={168} y1={42} x2={168} y2={252} strokeWidth={1.6} />

        {/* Crosier volute top — ornate inward spiral */}
        <path
          d="M 168 42 C 168 20, 186 12, 196 22 C 206 32, 200 44, 188 44 C 180 44, 176 38, 182 34"
          strokeWidth={1.6}
        />
        {/* Volute back-edge depth — slight offset */}
        <path
          d="M 170 44 C 170 24, 188 16, 198 24"
          opacity={0.35}
          strokeDasharray="2 3"
        />
        <Star cx={182} cy={34} r={2.2} twinkle={2} />
        <GlowStar cx={196} cy={22} rCore={2.5} rRing={6} />
      </g>

      {/* === Body constellation === */}
      <g opacity={0.85}>
        <Link x1={120} y1={56} x2={102} y2={82} />
        <Link x1={120} y1={56} x2={138} y2={82} />
        <Link x1={102} y1={82} x2={98} y2={118} />
        <Link x1={138} y1={82} x2={142} y2={118} />
        <Link x1={138} y1={82} x2={166} y2={120} />
        <Link x1={102} y1={82} x2={56} y2={140} />
        <Link x1={102} y1={82} x2={108} y2={170} dashed opacity={0.5} />
        <Link x1={138} y1={82} x2={132} y2={170} dashed opacity={0.5} />
        <Link x1={108} y1={170} x2={102} y2={244} />
        <Link x1={132} y1={170} x2={138} y2={244} />
      </g>

      {/* Robe depth folds */}
      <g opacity={0.35} strokeWidth={1} strokeDasharray="2 4">
        <path d="M 100 86 Q 86 160 92 244" />
        <path d="M 140 86 Q 150 160 144 244" />
      </g>

      {/* Bottom hem ellipse */}
      <ellipse cx={120} cy={250} rx={28} ry={5} opacity={0.5} />

      {/* Joint stars */}
      <Star cx={120} cy={56} r={3} twinkle={0} />
      <Star cx={102} cy={82} twinkle={1} />
      <Star cx={138} cy={82} twinkle={2} />
      <Star cx={98} cy={118} twinkle={3} />
      <Star cx={142} cy={118} twinkle={4} />
      <Star cx={166} cy={120} twinkle={5} />
      <Star cx={56} cy={140} twinkle={6} />
      <Star cx={108} cy={170} twinkle={7} />
      <Star cx={132} cy={170} twinkle={2} />
      <Star cx={102} cy={244} twinkle={4} />
      <Star cx={138} cy={244} twinkle={6} />

      {/* Head — oval, slightly wider than tall for the welcoming
          shepherd register. Inner star + spine link to the neck. */}
      <ellipse cx={120} cy={40} rx={11} ry={9} strokeWidth={1.4} />
      <line x1={120} y1={49} x2={120} y2={56} opacity={0.85} />
      <Star cx={120} cy={40} r={1.8} twinkle={5} />

      {/* Hood arc — constellation curve above the head */}
      <path d="M 100 48 Q 120 16 140 48" opacity={0.55} strokeDasharray="2 3" />

      {/* === Flock — constellation cluster of stars at lower left.
          Swirls rhythmically as a single group so the connecting
          lines stay tethered to the stars while the cluster orbits. */}
      <g className="xq-c3d-swirl">
        {/* Connection links between flock members */}
        <Link x1={42} y1={210} x2={56} y2={224} opacity={0.55} />
        <Link x1={42} y1={210} x2={28} y2={228} opacity={0.55} />
        <Link x1={56} y1={224} x2={50} y2={240} opacity={0.55} />
        <Link x1={28} y1={228} x2={50} y2={240} opacity={0.4} dashed />
        <Link x1={50} y1={240} x2={66} y2={238} opacity={0.55} />
        <Link x1={42} y1={210} x2={56} y2={140} opacity={0.3} dashed />

        {/* Flock stars (larger — they're the "subject") */}
        <Star cx={42} cy={210} r={3} twinkle={3} />
        <Star cx={56} cy={224} r={2.6} twinkle={5} />
        <Star cx={28} cy={228} r={2.4} twinkle={1} />
        <Star cx={50} cy={240} r={2.6} twinkle={7} />
        <Star cx={66} cy={238} r={2} twinkle={2} />
      </g>
    </Frame3D>
  );
}
