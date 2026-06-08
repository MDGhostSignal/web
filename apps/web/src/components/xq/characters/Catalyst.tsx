/**
 * Catalyst (X-P-L) — Cultural Spark.
 *
 * Visual brief: Forward-leaning figure with a megaphone, sparks or
 * particles streaming outward to a crowd of small silhouettes.
 * Kinetic, contagious energy.
 *
 * Compositional anchors:
 *   - Forward stride pose — front leg bent, back leg straight
 *   - Right arm raises a megaphone slightly above head
 *   - Cone of sparks streams diagonally up-right from the megaphone
 *   - Small crowd silhouettes appear in the lower right, "receiving"
 */

import { Frame, Head } from "./_shared";

export function CatalystCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Head — angled slightly more forward (4 deg lean cue) */}
      <Head cx={104} cy={62} r={15} />

      {/* Torso — more pronounced forward lean, heavier silhouette */}
      <path
        d="M 88 88 L 124 82 L 134 152 L 96 156 Z"
        strokeWidth={2.2}
      />

      {/* Center seam — thinner background */}
      <path d="M 106 88 L 110 156" opacity={0.35} strokeDasharray="1 3" strokeWidth={1.2} />

      {/* Ink-pool dots at shoulder joints */}
      <circle cx={88} cy={90} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={124} cy={84} r={1.6} fill="currentColor" stroke="none" />

      {/* Left arm — pulled back for balance */}
      <path d="M 90 92 C 76 112, 70 128, 74 148" />

      {/* Right arm — raised, holding megaphone */}
      <path d="M 124 90 C 134 78, 146 70, 152 64" />

      {/* Megaphone — classic bullhorn silhouette. Straight cone
          walls (not curved) diverging from a narrow grip end to a
          wide circular mouth. A trigger handle hangs perpendicular
          below the grip; an ellipse at the mouth shows the cone's
          opening depth. Body axis tilts up-right at ~29°. */}
      <g>
        {/* Cone body — straight diverging walls. Closed quad from
            grip end (narrow, vertical-ish) to mouth end (wide). */}
        <path
          d="M 150 58 L 156 72 L 222 38 L 196 18 Z"
          strokeWidth={2.4}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.1}
        />
        {/* Mouth opening — ellipse perpendicular to the cone axis,
            showing the bell's circular cross-section in side view */}
        <ellipse
          cx={209}
          cy={28}
          rx={11}
          ry={5}
          transform="rotate(-29 209 28)"
          strokeWidth={2}
          fill="currentColor"
          fillOpacity={0.06}
        />
        {/* Reinforcement ring at grip-to-cone seam */}
        <path d="M 151 60 L 158 73" strokeWidth={1.8} opacity={0.65} />
        {/* Trigger handle — hangs perpendicular below the grip end,
            classic bullhorn-style. Rotated to match the body axis. */}
        <path
          d="M 152 70 L 158 84 L 150 87 L 144 73 Z"
          strokeWidth={2}
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity={0.22}
        />
        {/* Small trigger button on the handle */}
        <circle cx={152} cy={78} r={1.6} fill="currentColor" stroke="none" />
      </g>

      {/* Ink-pool dot where right hand grips the trigger handle */}
      <circle cx={150} cy={84} r={1.6} fill="currentColor" stroke="none" />

      {/* Sparks streaming from the megaphone mouth. Parent group
          opacity removed so the line animation drives the full
          0.3↔1 range. */}
      <g strokeWidth={2.2}>
        <path className="xq-anim-catalyst-line" data-i="0" d="M 202 36 L 214 28" />
        <path className="xq-anim-catalyst-line" data-i="1" d="M 204 44 L 220 40" />
        <path className="xq-anim-catalyst-line" data-i="2" d="M 198 28 L 208 18" />
        <path className="xq-anim-catalyst-line" data-i="3" d="M 210 50 L 224 52" />
        <path className="xq-anim-catalyst-line" data-i="4" d="M 192 22 L 196 10" />
      </g>

      {/* Sparkles — small filled dots, drifting outward as they fade. */}
      <g fill="currentColor" stroke="none">
        <circle className="xq-anim-catalyst-spark" data-i="0" cx={216} cy={20} r={2} />
        <circle className="xq-anim-catalyst-spark" data-i="1" cx={228} cy={34} r={2} />
        <circle className="xq-anim-catalyst-spark" data-i="2" cx={222} cy={48} r={1.5} />
        <circle className="xq-anim-catalyst-spark" data-i="3" cx={210} cy={16} r={1.5} />
        <circle className="xq-anim-catalyst-spark" data-i="4" cx={232} cy={22} r={1.5} />
      </g>

      {/* Hip line */}
      <path d="M 96 156 L 134 152" opacity={0.6} strokeWidth={1.6} strokeLinecap="square" />

      {/* Ink-pool dot at hip pivot (kinetic stride origin) */}
      <circle cx={115} cy={154} r={1.4} fill="currentColor" stroke="none" />

      {/* Forward stride legs — front leg bent, back leg straight */}
      <path d="M 102 156 C 90 180, 80 200, 88 248" />
      <path d="M 128 152 C 138 180, 142 210, 144 248" />

      {/* Crowd silhouettes + dotted transmission trails removed —
          they competed visually with the megaphone and read as
          loose floating lines. The character now communicates its
          motif through the megaphone + spark cone alone. */}

      {/* Ground baseline */}
      <path d="M 60 254 Q 140 260 224 254" opacity={0.4} />
    </Frame>
  );
}
