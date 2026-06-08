/**
 * Shared primitives for the 8 3D-space line-art characters.
 *
 * Visual language:
 *   - viewBox 240×280, portrait (matches the 2D set for layout parity)
 *   - Isometric / 3/4 perspective on the figure pose
 *   - Depth via parallel construction lines + dashed back-edges
 *   - Constellation aesthetic: small filled stars at joints,
 *     thin connecting lines between them
 *   - currentColor everywhere — parent wrapper sets the accent
 *   - No fills except for stars (small circles) + glow centres
 */

import type { ReactNode } from "react";

type Frame3DProps = {
  title: string;
  children: ReactNode;
};

/** Frame wrapper with consistent viewBox + stroke defaults. */
export function Frame3D({ title, children }: Frame3DProps) {
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
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Constellation star — small filled circle marking a joint vertex.
 *  twinkleIndex (0-7) controls the animation-delay stagger via the
 *  data-t attribute. */
export function Star({
  cx,
  cy,
  r = 2.2,
  twinkle = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  twinkle?: number;
}) {
  return (
    <circle
      className="xq-c3d-star"
      data-t={twinkle}
      cx={cx}
      cy={cy}
      r={r}
      fill="currentColor"
      stroke="none"
    />
  );
}

/** Larger glowing star — for hero anchors (lantern flame, origin
 *  node, etc.). Filled centre + concentric outline ring. */
export function GlowStar({
  cx,
  cy,
  rCore = 3,
  rRing = 7,
}: {
  cx: number;
  cy: number;
  rCore?: number;
  rRing?: number;
}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={rRing} opacity={0.5} />
      <circle cx={cx} cy={cy} r={rCore} fill="currentColor" stroke="none" />
    </>
  );
}

/** Constellation connector — thin line between two stars. */
export function Link({
  x1,
  y1,
  x2,
  y2,
  opacity = 0.7,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity?: number;
  dashed?: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={1}
      opacity={opacity}
      strokeDasharray={dashed ? "2 3" : undefined}
    />
  );
}

/** Orbital arc — subtle celestial-halo curve behind the figure.
 *  Adds the "in space" register to every character. */
export function OrbitalHalo() {
  return (
    <>
      <path
        d="M 28 200 Q 120 130 212 200"
        opacity={0.18}
        strokeWidth={1}
        strokeDasharray="3 5"
      />
      <path
        d="M 16 220 Q 120 140 224 220"
        opacity={0.12}
        strokeWidth={1}
        strokeDasharray="2 6"
      />
    </>
  );
}
