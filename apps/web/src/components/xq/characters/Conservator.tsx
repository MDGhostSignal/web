/**
 * Conservator (C-S-C) — Master Craftsman of Order.
 *
 * Visual brief: Seated craftsman bent over a ledger, compass in one
 * hand, fine instruments arrayed in a precise grid. Quiet intensity,
 * ordered tools, measured posture.
 *
 * Compositional anchors:
 *   - Seated at a low desk/bench, body bent forward in concentration
 *   - Open ledger book under the hands
 *   - Compass held in the right hand, mid-measurement
 *   - A neat row of instruments (quill, ruler, dividers) arrayed
 *     beneath the desk surface
 */

import { Frame, Head } from "./_shared";

export function ConservatorCharacter({ title }: { title: string }) {
  return (
    <Frame title={title}>
      {/* Bench/desk surface — heavier hero line for the workbench,
          squared linecaps for the architectural register */}
      <path d="M 32 178 L 208 178" strokeWidth={2.4} strokeLinecap="square" />
      <path d="M 32 178 L 32 220" opacity={0.55} strokeWidth={1.6} strokeLinecap="square" />
      <path d="M 208 178 L 208 220" opacity={0.55} strokeWidth={1.6} strokeLinecap="square" />

      {/* Head — bowed forward, asymmetric tilt (slightly right) */}
      <Head cx={115} cy={88} r={14} />

      {/* Hood collar — thinner background */}
      <path d="M 98 96 Q 115 77 131 96" opacity={0.45} strokeWidth={1.4} />

      {/* Torso — bent forward, heavier outer silhouette */}
      <path
        d="M 92 110 C 90 128, 96 150, 102 168 L 138 168 C 144 150, 142 128, 136 110 Z"
        strokeWidth={2.2}
      />

      {/* Inner robe seam — thinner background */}
      <path d="M 114 110 L 120 168" opacity={0.35} strokeDasharray="1 3" strokeWidth={1.2} />

      {/* Ink-pool dots at shoulder joints */}
      <circle cx={92} cy={112} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={136} cy={112} r={1.6} fill="currentColor" stroke="none" />

      {/* Left arm — resting on the open ledger */}
      <path d="M 96 120 C 86 138, 84 156, 96 170" />

      {/* Right arm — holding the compass, slight angle */}
      <path d="M 134 120 C 144 134, 150 154, 144 170" />

      {/* Ink-pool dots at hands resting on the ledger */}
      <circle cx={96} cy={170} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={144} cy={170} r={1.4} fill="currentColor" stroke="none" />

      {/* Open ledger on the desk — two pages meeting at a central
          binding */}
      <g>
        <path
          d="M 80 178 L 96 168 L 120 170 L 120 178 Z"
        />
        <path
          d="M 158 178 L 144 168 L 120 170 L 120 178 Z"
        />
        {/* Page lines */}
        <path d="M 92 172 L 116 174" opacity={0.4} />
        <path d="M 96 175 L 116 176" opacity={0.4} />
        <path d="M 148 172 L 124 174" opacity={0.4} />
        <path d="M 152 175 L 124 176" opacity={0.4} />
      </g>

      {/* Compass in the right hand — two arms meeting at a hinge.
          Rocks ±1.6° as if mid-measurement (7s loop). */}
      <g className="xq-anim-conservator-compass" strokeWidth={2.2}>
        <path d="M 142 170 L 132 142" />
        <path d="M 142 170 L 156 144" />
        {/* Compass hinge */}
        <circle cx={144} cy={140} r={2.5} fill="currentColor" stroke="none" />
        {/* Compass tip mark on the ledger */}
        <circle cx={132} cy={172} r={1.5} fill="currentColor" stroke="none" opacity={0.7} />
        <circle cx={156} cy={172} r={1.5} fill="currentColor" stroke="none" opacity={0.7} />
      </g>

      {/* Instruments arrayed beneath the desk — quill, ruler, divider */}
      <g opacity={0.7}>
        {/* Quill */}
        <path d="M 48 196 L 88 196" strokeWidth={2.2} />
        <path d="M 48 196 L 44 200" />
        {/* Ruler */}
        <path d="M 100 200 L 156 200" strokeWidth={2.2} />
        <path d="M 108 198 L 108 202" opacity={0.6} />
        <path d="M 120 198 L 120 202" opacity={0.6} />
        <path d="M 132 198 L 132 202" opacity={0.6} />
        <path d="M 144 198 L 144 202" opacity={0.6} />
        {/* Divider */}
        <path d="M 170 196 L 178 208" />
        <path d="M 170 196 L 162 208" />
        <circle cx={170} cy={196} r={1.5} fill="currentColor" stroke="none" />
      </g>

      {/* Seated lower body — legs disappear behind the bench, just
          a hint of knees beneath */}
      <path d="M 92 220 L 92 248" opacity={0.7} />
      <path d="M 148 220 L 148 248" opacity={0.7} />

      {/* Ground baseline */}
      <path d="M 32 256 L 208 256" opacity={0.4} strokeDasharray="2 4" />
    </Frame>
  );
}
