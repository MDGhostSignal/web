/**
 * Shared SVG primitives for the 8 XQ character illustrations. Every
 * character file imports `Frame` and the basic body parts so the
 * monoline rhythm + proportions stay consistent across the set.
 *
 * Conventions:
 *   - viewBox 240×280, portrait
 *   - strokeWidth 1.8 for the primary line, 2.2 for the signature prop
 *   - currentColor everywhere (parent sets `color` to the archetype
 *     accent in XQCharacter.tsx)
 *   - No facial features — kept universal/symbolic
 *   - Subtle ground baseline arc at y≈250 anchors the figure
 */

import type { ReactNode } from "react";

type FrameProps = {
  title: string;
  children: ReactNode;
};

/** Wraps each character SVG with consistent attributes + a title for
 *  screen readers. `currentColor` cascades from the XQCharacter
 *  wrapper so children just use `stroke="currentColor"`. */
export function Frame({ title, children }: FrameProps) {
  return (
    <svg
      viewBox="0 0 240 280"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      width="100%"
      height="100%"
      style={{ maxWidth: 240, maxHeight: 280 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Subtle ground arc beneath the figure. Visually anchors the
 *  illustration without committing to a hard floor line. */
export function GroundArc() {
  return (
    <path
      d="M 60 250 Q 120 258 180 250"
      opacity={0.45}
      strokeDasharray="2 4"
    />
  );
}

/** Head — simple circle, no features, intentionally universal. */
export function Head({
  cx = 120,
  cy = 70,
  r = 16,
}: {
  cx?: number;
  cy?: number;
  r?: number;
}) {
  return <circle cx={cx} cy={cy} r={r} />;
}

/** Shoulder-to-hip torso line — gentle taper, used for upright
 *  standing figures. Body curves left/right based on `lean`. */
export function StandingTorso({
  cx = 120,
  topY = 88,
  bottomY = 180,
  lean = 0,
}: {
  cx?: number;
  topY?: number;
  bottomY?: number;
  /** Horizontal offset of the lower end (-30..30) for posture. */
  lean?: number;
}) {
  return (
    <path
      d={`M ${cx - 14} ${topY} C ${cx - 12} ${topY + 30}, ${cx - 14 + lean} ${bottomY - 20}, ${cx - 10 + lean} ${bottomY} L ${cx + 10 + lean} ${bottomY} C ${cx + 14 + lean} ${bottomY - 20}, ${cx + 12} ${topY + 30}, ${cx + 14} ${topY} Z`}
    />
  );
}

/** Two legs descending to ground baseline. Used for standing
 *  figures whose torso ends mid-body. */
export function StandingLegs({
  hipY = 180,
  groundY = 248,
  cx = 120,
}: {
  hipY?: number;
  groundY?: number;
  cx?: number;
}) {
  return (
    <>
      <path d={`M ${cx - 6} ${hipY} L ${cx - 9} ${groundY}`} />
      <path d={`M ${cx + 6} ${hipY} L ${cx + 9} ${groundY}`} />
    </>
  );
}
