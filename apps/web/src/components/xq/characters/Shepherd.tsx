/**
 * Shepherd (C-P-L) — Community Unifier.
 *
 * Visual brief: Open-armed figure with a long staff, gathering a small
 * flock or constellation of dots. Warm, welcoming, expansive gesture
 * without losing intimacy.
 *
 * Compositional anchors:
 *   - Right hand grips a tall staff anchored vertically
 *   - Left arm sweeps open across the body in welcome
 *   - Robe drops to ground in soft folds — continuity register
 *   - A small cluster of dot-figures gathers at the lower left
 */

import { Frame } from "./_shared";

export function ShepherdCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Tall staff — drawn first so it sits behind the right hand.
          Heavier confidence stroke (2.4), squared cap. Staff now
          terminates at y=42 (below the volute's lowest point) so the
          curl crowns it cleanly. */}
      <path d="M 168 42 L 168 252" strokeWidth={2.4} strokeLinecap="square" />

      {/* Crosier-style ornate volute — ceremonial without being a
          religious cross. Reads as a priest's staff with a classical
          inward spiral, a small finial at the apex, and a decorative
          collar where it joins the staff shaft. */}
      <g>
        {/* Decorative collar at the staff-to-volute transition */}
        <path d="M 161 42 L 175 42" strokeWidth={2.6} strokeLinecap="round" />
        <path d="M 163 38 L 173 38" strokeWidth={1.8} opacity={0.75} />

        {/* Main volute — a single sweeping path that rises from the
            staff top, arcs up-and-right, curls down, and spirals
            inward to a tight terminus */}
        <path
          d="M 168 38 C 168 18, 184 8, 194 18 C 204 28, 200 40, 188 42 C 180 43, 175 37, 180 32 C 182 30, 185 32, 185 34"
          strokeWidth={2.2}
          strokeLinejoin="round"
          fill="none"
        />

        {/* Small bead at the spiral's eye — the volute's centre */}
        <circle cx={185} cy={34} r={1.6} fill="currentColor" stroke="none" />

        {/* Decorative finial at the volute's outer apex */}
        <circle cx={194} cy={18} r={2.2} fill="currentColor" stroke="none" />
      </g>

      {/* Head */}
      <circle cx={120} cy={62} r={15} />

      {/* Hood collar — slight tilt right toward staff */}
      <path d="M 102 72 Q 122 51 138 73" opacity={0.5} strokeWidth={1.4} />

      {/* Robe — asymmetric: wider on the left (gathering side, away
          from the staff hand), heavier outer silhouette (2.2) */}
      <path
        d="M 94 86 C 80 130, 70 184, 64 248 L 168 248 C 168 184, 164 130, 144 86"
        strokeWidth={2.2}
      />

      {/* Robe folds — thinner background hints */}
      <path d="M 110 100 L 96 244" opacity={0.3} strokeDasharray="1 4" strokeWidth={1.2} />
      <path d="M 130 100 L 140 244" opacity={0.3} strokeDasharray="1 4" strokeWidth={1.2} />

      {/* Right arm — reaching up to grip the staff */}
      <path d="M 138 96 C 148 110, 158 122, 166 130" />

      {/* Right hand on staff — small bracket, heavier */}
      <path d="M 161 128 L 175 131" strokeWidth={2.4} strokeLinecap="square" />

      {/* Left arm — sweeping open across the body, palm-out welcome */}
      <path d="M 100 96 C 74 110, 56 138, 48 168" />

      {/* Left palm — small fan suggesting open hand */}
      <path d="M 48 168 L 40 168" />
      <path d="M 48 168 L 42 174" />
      <path d="M 48 168 L 44 162" />

      {/* Ink-pool dots — shoulder joints, hand grips */}
      <circle cx={95} cy={88} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={143} cy={88} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={168} cy={130} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={48} cy={168} r={1.4} fill="currentColor" stroke="none" />

      {/* Flock — cluster of small circles at the lower left. Each
          dot pulses (opacity + scale) on a stagger so the flock
          breathes. Parent group opacity removed so animation drives
          the full 0.25↔1 range. */}
      <g>
        <circle className="xq-anim-shepherd-dot" data-i="0" cx={42} cy={210} r={4} fill="currentColor" stroke="none" />
        <circle className="xq-anim-shepherd-dot" data-i="1" cx={56} cy={224} r={3.5} fill="currentColor" stroke="none" />
        <circle className="xq-anim-shepherd-dot" data-i="2" cx={32} cy={228} r={3} fill="currentColor" stroke="none" />
        <circle className="xq-anim-shepherd-dot" data-i="3" cx={50} cy={240} r={3} fill="currentColor" stroke="none" />
        <circle className="xq-anim-shepherd-dot" data-i="4" cx={66} cy={238} r={2.5} fill="currentColor" stroke="none" />
        <circle className="xq-anim-shepherd-dot" data-i="5" cx={24} cy={242} r={2.5} fill="currentColor" stroke="none" />
      </g>

      {/* Soft connecting lines from the left palm to the flock,
          suggesting invitation */}
      <g opacity={0.35} strokeDasharray="2 4" strokeWidth={1.2}>
        <path d="M 48 168 L 42 210" />
        <path d="M 48 168 L 56 224" />
      </g>

      {/* Ground baseline — gentle arc */}
      <path d="M 24 256 Q 120 264 200 256" opacity={0.45} />
      <path
        d="M 12 268 Q 120 278 220 268"
        opacity={0.25}
        strokeDasharray="2 4"
      />
    </Frame>
  );
}
