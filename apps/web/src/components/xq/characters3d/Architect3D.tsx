/**
 * Architect (X-S-L) — 3D constellation.
 *
 * Standing figure with arms outstretched, surrounded by a 3D cube
 * network of stars connected by constellation lines. Central
 * heart-orb glows at the system origin. The network's 12 edges are
 * rendered with hidden-edge dashed convention so the cube reads as
 * a true 3D form.
 */

import {
  Frame3D,
  GlowStar,
  Link,
  OrbitalHalo,
  Star,
} from "./_shared3d";

export function Architect3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* === Cube network — 8 stars at corners + 12 edges === */}
      {/* Front face (visible): TL TR BR BL  */}
      {/* Back face (hidden):   TL' TR' BR' BL' (offset up-right) */}
      {(() => {
        // Cube corners
        const f = {
          tl: { x: 36, y: 70 },
          tr: { x: 204, y: 70 },
          br: { x: 204, y: 220 },
          bl: { x: 36, y: 220 },
        };
        const b = {
          tl: { x: 60, y: 46 },
          tr: { x: 228, y: 46 },
          br: { x: 228, y: 196 },
          bl: { x: 60, y: 196 },
        };
        return (
          <g className="xq-c3d-counter">
            {/* Front face edges */}
            <Link x1={f.tl.x} y1={f.tl.y} x2={f.tr.x} y2={f.tr.y} />
            <Link x1={f.tr.x} y1={f.tr.y} x2={f.br.x} y2={f.br.y} />
            <Link x1={f.br.x} y1={f.br.y} x2={f.bl.x} y2={f.bl.y} />
            <Link x1={f.bl.x} y1={f.bl.y} x2={f.tl.x} y2={f.tl.y} />
            {/* Back face edges — dashed (hidden) */}
            <Link x1={b.tl.x} y1={b.tl.y} x2={b.tr.x} y2={b.tr.y} dashed opacity={0.5} />
            <Link x1={b.tr.x} y1={b.tr.y} x2={b.br.x} y2={b.br.y} opacity={0.6} />
            <Link x1={b.br.x} y1={b.br.y} x2={b.bl.x} y2={b.bl.y} dashed opacity={0.5} />
            <Link x1={b.bl.x} y1={b.bl.y} x2={b.tl.x} y2={b.tl.y} dashed opacity={0.5} />
            {/* Connecting edges front → back */}
            <Link x1={f.tl.x} y1={f.tl.y} x2={b.tl.x} y2={b.tl.y} opacity={0.6} />
            <Link x1={f.tr.x} y1={f.tr.y} x2={b.tr.x} y2={b.tr.y} opacity={0.7} />
            <Link x1={f.br.x} y1={f.br.y} x2={b.br.x} y2={b.br.y} opacity={0.7} />
            <Link x1={f.bl.x} y1={f.bl.y} x2={b.bl.x} y2={b.bl.y} dashed opacity={0.5} />

            {/* Stars at all 8 corners */}
            <Star cx={f.tl.x} cy={f.tl.y} twinkle={0} />
            <Star cx={f.tr.x} cy={f.tr.y} twinkle={2} />
            <Star cx={f.br.x} cy={f.br.y} twinkle={4} />
            <Star cx={f.bl.x} cy={f.bl.y} twinkle={6} />
            <Star cx={b.tl.x} cy={b.tl.y} twinkle={1} />
            <Star cx={b.tr.x} cy={b.tr.y} twinkle={3} />
            <Star cx={b.br.x} cy={b.br.y} twinkle={5} />
            <Star cx={b.bl.x} cy={b.bl.y} twinkle={7} />
          </g>
        );
      })()}

      {/* Head — pentagon, five-sided systemic geometry inside the
          cube network. Connected to the neck anchor via a short
          spine link. */}
      <path
        d="M 120 50 L 135 61 L 130 80 L 110 80 L 105 61 Z"
        strokeWidth={1.4}
      />
      <line x1={120} y1={80} x2={120} y2={86} opacity={0.85} />
      <Star cx={120} cy={66} r={1.8} twinkle={6} />

      {/* === Figure constellation, inside the cube === */}
      <g opacity={0.85}>
        <Link x1={120} y1={86} x2={104} y2={108} />
        <Link x1={120} y1={86} x2={136} y2={108} />
        <Link x1={104} y1={108} x2={80} y2={140} />
        <Link x1={136} y1={108} x2={160} y2={140} />
        <Link x1={104} y1={108} x2={110} y2={170} />
        <Link x1={136} y1={108} x2={130} y2={170} />
        <Link x1={110} y1={170} x2={104} y2={240} />
        <Link x1={130} y1={170} x2={136} y2={240} />
      </g>

      {/* Figure joint stars */}
      <Star cx={120} cy={86} r={3} twinkle={0} />
      <Star cx={104} cy={108} twinkle={3} />
      <Star cx={136} cy={108} twinkle={5} />
      <Star cx={80} cy={140} twinkle={4} />
      <Star cx={160} cy={140} twinkle={2} />
      <Star cx={110} cy={170} twinkle={6} />
      <Star cx={130} cy={170} twinkle={1} />
      <Star cx={104} cy={240} twinkle={7} />
      <Star cx={136} cy={240} twinkle={4} />

      {/* === Central heart origin — large glowing star === */}
      <GlowStar cx={120} cy={142} rCore={4} rRing={10} />
      <circle cx={120} cy={142} r={18} opacity={0.18} strokeDasharray="2 4" />

      {/* Radial connectors from origin to extended-hand nodes (cube
          corners closest to the figure's reach) — the architect is
          touching the network */}
      <g opacity={0.55}>
        <Link x1={120} y1={142} x2={80} y2={140} opacity={0.6} />
        <Link x1={120} y1={142} x2={160} y2={140} opacity={0.6} />
        <Link x1={120} y1={142} x2={204} y2={70} dashed opacity={0.4} />
        <Link x1={120} y1={142} x2={36} y2={220} dashed opacity={0.4} />
      </g>
    </Frame3D>
  );
}
