/**
 * Designer (X-S-C) — 3D constellation.
 *
 * Standing figure beside an isometric wireframe drafting board.
 * Board shown as a 3D parallelogram with grid lines on its surface
 * + back edges dashed. Triangle ruler and compass laid on top.
 * The drafting curve appears as a constellation arc.
 */

import { Frame3D, GlowStar, Link, OrbitalHalo, Star } from "./_shared3d";

export function Designer3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* === Drafting board — isometric wireframe parallelogram === */}
      <g className="xq-c3d-counter">
        {/* Front face — top, right, bottom, left edges */}
        <path
          d="M 80 232 L 80 168 L 220 130 L 220 196 Z"
          strokeWidth={1.6}
        />
        {/* Back face (offset up-right) — dashed */}
        <path
          d="M 90 226 L 90 162 L 230 124 L 230 190 Z"
          opacity={0.4}
          strokeDasharray="2 3"
        />
        {/* Connecting edges */}
        <g opacity={0.55}>
          <line x1={80} y1={168} x2={90} y2={162} />
          <line x1={220} y1={130} x2={230} y2={124} />
          <line x1={220} y1={196} x2={230} y2={190} />
          <line x1={80} y1={232} x2={90} y2={226} strokeDasharray="2 3" />
        </g>

        {/* Grid lines on the board surface */}
        <g opacity={0.35} strokeWidth={1}>
          <line x1={104} y1={226} x2={104} y2={162} />
          <line x1={134} y1={213} x2={134} y2={150} />
          <line x1={164} y1={204} x2={164} y2={141} />
          <line x1={194} y1={196} x2={194} y2={133} />
          <line x1={80} y1={200} x2={220} y2={163} />
          <line x1={80} y1={184} x2={220} y2={146} />
        </g>
      </g>

      {/* === Emerging curve — constellation arc === */}
      <g>
        <path
          d="M 100 200 C 124 180, 162 174, 196 184"
          strokeWidth={2}
        />
        {/* Curve control point stars */}
        <Star cx={100} cy={200} r={2.6} twinkle={0} />
        <Star cx={148} cy={178} r={2.2} twinkle={2} />
        <GlowStar cx={196} cy={184} rCore={2.6} rRing={6} />
      </g>

      {/* === Triangle ruler — wireframe with depth === */}
      <g>
        <path
          d="M 100 174 L 144 174 L 144 134 Z"
          strokeWidth={1.5}
        />
        {/* Back-edge depth */}
        <path
          d="M 105 170 L 148 170 L 148 130"
          opacity={0.4}
          strokeDasharray="2 3"
        />
        <Star cx={100} cy={174} twinkle={1} />
        <Star cx={144} cy={174} twinkle={3} />
        <Star cx={144} cy={134} twinkle={5} />
      </g>

      {/* === Compass — wireframe === */}
      <g>
        <line x1={154} y1={152} x2={168} y2={130} strokeWidth={1.6} />
        <line x1={154} y1={152} x2={144} y2={130} strokeWidth={1.6} />
        <Star cx={156} cy={128} r={2.4} twinkle={4} />
        <Star cx={154} cy={152} r={1.8} twinkle={6} />
        <Star cx={144} cy={130} r={1.6} twinkle={2} />
      </g>

      {/* Head — hexagon, echoes the precise geometric register of
          the drafting board + ruler + compass. Connected to the
          neck anchor via a short spine link. */}
      <path
        d="M 62 22 L 73 28 L 73 42 L 62 48 L 51 42 L 51 28 Z"
        strokeWidth={1.4}
      />
      <line x1={62} y1={48} x2={62} y2={56} opacity={0.85} />
      <Star cx={62} cy={35} r={1.8} twinkle={4} />

      {/* === Designer figure beside the board === */}
      <g opacity={0.85}>
        <Link x1={62} y1={56} x2={44} y2={82} />
        <Link x1={62} y1={56} x2={80} y2={82} />
        <Link x1={44} y1={82} x2={50} y2={150} />
        <Link x1={80} y1={82} x2={74} y2={150} />
        <Link x1={80} y1={82} x2={108} y2={172} dashed opacity={0.5} />
        <Link x1={50} y1={150} x2={54} y2={246} />
        <Link x1={74} y1={150} x2={70} y2={246} />
      </g>

      <Star cx={62} cy={56} r={3} twinkle={0} />
      <Star cx={44} cy={82} twinkle={2} />
      <Star cx={80} cy={82} twinkle={4} />
      <Star cx={50} cy={150} twinkle={6} />
      <Star cx={74} cy={150} twinkle={1} />
      <Star cx={54} cy={246} twinkle={5} />
      <Star cx={70} cy={246} twinkle={3} />
    </Frame3D>
  );
}
