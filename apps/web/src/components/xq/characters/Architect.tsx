/**
 * Architect (X-S-L) — Systemic Disruptor.
 *
 * Visual brief: Standing figure orchestrating a network of nodes and
 * connections suspended around them. Systemic scale, calm command,
 * infrastructure as canvas.
 *
 * Compositional anchors:
 *   - Upright stance, no robe — modern angular silhouette
 *   - Right arm extended horizontally, palm-out as if commanding
 *   - A network of 6-8 connected nodes floats in the negative space
 *     around the figure, with the strongest connector aligned to the
 *     extended hand
 *   - One central node sits over the heart — the system origin
 */

import { Frame, GroundArc, Head, StandingLegs } from "./_shared";

export function ArchitectCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Network of system nodes — drawn first so they sit behind the
          figure visually. Each node pulses in sequence, lighting up
          around the figure like data transmission. Parent group
          opacity removed so the animation drives the full 0.2↔1 range. */}
      <g>
        {/* Top-left cluster */}
        <circle className="xq-anim-architect-node" data-i="0" cx={48} cy={62} r={4} />
        <circle className="xq-anim-architect-node" data-i="1" cx={70} cy={38} r={3} />
        <circle className="xq-anim-architect-node" data-i="2" cx={32} cy={102} r={3} />
        {/* Top-right cluster */}
        <circle className="xq-anim-architect-node" data-i="3" cx={196} cy={70} r={4} />
        <circle className="xq-anim-architect-node" data-i="4" cx={216} cy={108} r={3} />
        <circle className="xq-anim-architect-node" data-i="5" cx={178} cy={42} r={3} />
        {/* Mid-right (aligned with extended hand) */}
        <circle className="xq-anim-architect-node" data-i="6" cx={206} cy={148} r={5} />
        {/* Lower nodes */}
        <circle className="xq-anim-architect-node" data-i="7" cx={56} cy={188} r={3} />
        <circle className="xq-anim-architect-node" data-i="8" cx={196} cy={206} r={3} />

        {/* Connectors — only some nodes are linked, forming a graph */}
        <path d="M 48 62 L 70 38" strokeDasharray="2 3" />
        <path d="M 48 62 L 32 102" strokeDasharray="2 3" />
        <path d="M 196 70 L 178 42" strokeDasharray="2 3" />
        <path d="M 196 70 L 216 108" strokeDasharray="2 3" />
        <path d="M 216 108 L 206 148" strokeDasharray="2 3" />
        <path d="M 56 188 L 32 102" strokeDasharray="2 3" />
        <path d="M 196 206 L 206 148" strokeDasharray="2 3" />
      </g>

      {/* Head */}
      <Head cx={120} cy={62} r={15} />

      {/* Shoulders + torso — broader shoulders for the architect's
          command posture (96/144 vs 100/140), heavier outline (2.2) */}
      <path
        d="M 96 88 L 106 82 L 134 82 L 144 88 L 140 158 L 100 158 Z"
        strokeWidth={2.2}
        strokeLinecap="square"
      />

      {/* Ink-pool dots at the angular shoulder joints */}
      <circle cx={96} cy={88} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={144} cy={88} r={1.6} fill="currentColor" stroke="none" />

      {/* Center vertical seam — thinner background */}
      <path d="M 120 88 L 120 158" opacity={0.4} strokeDasharray="1 3" strokeWidth={1.2} />

      {/* Hip belt — squared caps for modern register */}
      <path d="M 100 158 L 140 158" opacity={0.6} strokeWidth={1.6} strokeLinecap="square" />

      {/* Lower body — straight columns to ground */}
      <StandingLegs hipY={158} groundY={248} cx={120} />

      {/* Left arm — resting at side */}
      <path d="M 100 92 C 92 124, 92 144, 96 158" />

      {/* Right arm — extended outward, heavier confidence stroke */}
      <path d="M 142 92 L 184 116 L 200 142" strokeWidth={2.2} />

      {/* Palm — small fan of three short lines suggesting fingers */}
      <path d="M 200 142 L 208 138" />
      <path d="M 200 142 L 210 144" />
      <path d="M 200 142 L 208 150" />

      {/* Ink-pool dot at the palm anchor + elbow */}
      <circle cx={200} cy={142} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={184} cy={116} r={1.4} fill="currentColor" stroke="none" opacity={0.7} />

      {/* Strong connector from palm to the mid-right anchor node —
          the active link the architect is touching */}
      <path
        d="M 200 142 L 206 148"
        opacity={0.9}
        strokeWidth={2.4}
      />

      {/* Central origin node over the heart — solid, filled in
          accent. Breathes gently (4.4s) — the architect IS the hub.
          Inline opacities removed so animations drive full ranges. */}
      <circle
        className="xq-anim-architect-origin"
        cx={120}
        cy={118}
        r={5}
        fill="currentColor"
        stroke="none"
      />
      <circle
        className="xq-anim-architect-origin-ring"
        cx={120}
        cy={118}
        r={9}
      />

      {/* Subtle connectors radiating from the origin node to the
          floating cluster — the architect IS the network's hub */}
      <g opacity={0.3} strokeDasharray="2 4">
        <path d="M 120 118 L 48 62" />
        <path d="M 120 118 L 196 70" />
        <path d="M 120 118 L 32 102" />
        <path d="M 120 118 L 216 108" />
        <path d="M 120 118 L 56 188" />
        <path d="M 120 118 L 196 206" />
      </g>

      <GroundArc />
    </Frame>
  );
}
