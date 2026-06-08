/**
 * Catalyst (X-P-L) — 3D constellation.
 *
 * Comet-inspired silhouette — forward-leaning figure raising a 3D
 * wireframe megaphone, with a streaming constellation trail of
 * stars (the "spark cone") emanating from the mouth. Megaphone
 * rendered as an isometric cone with parallel construction lines
 * along its body.
 */

import {
  Frame3D,
  GlowStar,
  Link,
  OrbitalHalo,
  Star,
} from "./_shared3d";

export function Catalyst3D({ title }: { title: string }) {
  return (
    <Frame3D title={title}>
      <OrbitalHalo />

      {/* Head — triangle pointing up, echoes the kinetic
          forward-thrust energy. Connected to the neck anchor via
          a short spine link. */}
      <path d="M 104 30 L 117 52 L 91 52 Z" strokeWidth={1.4} />
      <line x1={104} y1={52} x2={104} y2={58} opacity={0.85} />
      <Star cx={104} cy={45} r={1.8} twinkle={1} />

      {/* === Body constellation — forward-leaning figure === */}
      <g opacity={0.85}>
        <Link x1={104} y1={58} x2={88} y2={88} />
        <Link x1={104} y1={58} x2={124} y2={84} />
        <Link x1={88} y1={88} x2={74} y2={148} />
        <Link x1={124} y1={84} x2={148} y2={62} />
        <Link x1={88} y1={88} x2={96} y2={156} dashed opacity={0.5} />
        <Link x1={124} y1={84} x2={134} y2={152} dashed opacity={0.5} />
        <Link x1={96} y1={156} x2={88} y2={246} />
        <Link x1={134} y1={152} x2={144} y2={246} />
      </g>

      {/* Body depth ridges — parallel lines on the torso for volume */}
      <g opacity={0.3} strokeWidth={1} strokeDasharray="1 3">
        <path d="M 92 96 L 100 152" />
        <path d="M 120 92 L 128 152" />
      </g>

      {/* Joint stars */}
      <Star cx={104} cy={58} r={3} twinkle={0} />
      <Star cx={88} cy={88} twinkle={2} />
      <Star cx={124} cy={84} twinkle={4} />
      <Star cx={74} cy={148} twinkle={5} />
      <Star cx={148} cy={62} twinkle={6} />
      <Star cx={96} cy={156} twinkle={1} />
      <Star cx={134} cy={152} twinkle={3} />
      <Star cx={88} cy={246} twinkle={7} />
      <Star cx={144} cy={246} twinkle={5} />

      {/* === Megaphone — isometric wireframe cone === */}
      <g>
        {/* Cone body — front edge (solid) */}
        <path
          d="M 148 56 L 156 72 L 218 38 L 200 18 Z"
          strokeWidth={1.6}
        />
        {/* Back edge depth — offset, dashed */}
        <path
          d="M 153 50 L 161 66 L 223 32 L 205 12"
          opacity={0.45}
          strokeDasharray="2 3"
        />
        {/* Connecting edges front → back */}
        <g opacity={0.55}>
          <line x1={148} y1={56} x2={153} y2={50} />
          <line x1={200} y1={18} x2={205} y2={12} />
          <line x1={218} y1={38} x2={223} y2={32} />
        </g>
        {/* Bell mouth ellipse — circular cross-section in side view */}
        <ellipse
          cx={209}
          cy={28}
          rx={11}
          ry={5}
          transform="rotate(-29 209 28)"
          opacity={0.8}
        />
        {/* Mouth back rim (slightly behind) */}
        <ellipse
          cx={214}
          cy={22}
          rx={9}
          ry={4}
          transform="rotate(-29 214 22)"
          opacity={0.35}
          strokeDasharray="2 3"
        />
        {/* Trigger handle — perpendicular below grip */}
        <path
          d="M 148 68 L 154 84 L 144 86 L 142 70 Z"
          opacity={0.8}
        />
        <Star cx={148} cy={76} twinkle={4} />
      </g>

      {/* === Spark cone — sparks emit from the megaphone mouth, drift
          outward, and fall with trajectory + momentum. Each spark
          starts at its emit position then translates down-right
          while fading, on a stagger. */}
      <g>
        {/* Static cone outline (faint connectors at the mouth) */}
        <Link x1={216} y1={36} x2={220} y2={26} opacity={0.4} dashed />
        <Link x1={220} y1={26} x2={208} y2={20} opacity={0.4} dashed />

        {/* Falling spark stars — 18 bigger sparks emit from the
            megaphone mouth, travel up to (60px, 70px) — far right
            and far down, well clear of the character. Staggered
            intervals so the cone reads as a constant stream. */}
        <g className="xq-c3d-spark-fall" data-i="0">
          <Star cx={216} cy={20} r={3.4} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="1">
          <Star cx={222} cy={14} r={2.8} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="2">
          <Star cx={228} cy={24} r={3} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="3">
          <Star cx={212} cy={28} r={2.4} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="4">
          <Star cx={224} cy={32} r={2.6} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="5">
          <Star cx={218} cy={8} r={2.2} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="6">
          <Star cx={232} cy={18} r={2.4} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="7">
          <Star cx={214} cy={12} r={2.6} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="8">
          <Star cx={226} cy={6} r={2.2} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="9">
          <Star cx={220} cy={36} r={2.8} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="10">
          <Star cx={210} cy={16} r={2.2} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="11">
          <Star cx={230} cy={28} r={2.6} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="12">
          <Star cx={224} cy={20} r={3} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="13">
          <Star cx={216} cy={32} r={2.4} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="14">
          <Star cx={228} cy={12} r={2.6} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="15">
          <Star cx={218} cy={24} r={2.8} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="16">
          <Star cx={232} cy={36} r={2.4} />
        </g>
        <g className="xq-c3d-spark-fall" data-i="17">
          <Star cx={214} cy={4} r={2.2} />
        </g>

        {/* Anchor glow star at the mouth — stays put while sparks fall */}
        <GlowStar cx={210} cy={22} rCore={2.4} rRing={6} />
      </g>
    </Frame3D>
  );
}
