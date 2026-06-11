/**
 * XQCharacterMark — non-animated, logo-like marks for the 8 archetypes.
 *
 * The full line-art and 3D character renderers ship a lot of detail
 * (constellation stars, depth lines, props, animation), which works
 * at gallery scale (~240×280) but reads as thin jittery noise inside
 * the small ringed circles on the spectrum map. This mark variant
 * exists for that use case: each archetype is reduced to a single
 * logo-like silhouette built from its distinct head shape plus a
 * minimal signature glyph — instantly recognisable at 56-76px.
 *
 * Head-shape system:
 *   Steward            — circle
 *   Shepherd           — oval (wider than tall)
 *   Conservator        — square    (precision/order register)
 *   Institution Builder — rounded rectangle (pillar-capital register)
 *   Artisan            — diamond
 *   Catalyst           — triangle (point up)
 *   Designer           — hexagon
 *   Architect          — pentagon
 *
 * Below each head: a small signature glyph derived from the archetype's
 * `prop` field (flame, staff+flock, compass, pillars, brush, sparks,
 * grid, node graph).
 *
 * All strokes use currentColor — the parent wrapper sets the accent so
 * marks pick up the archetype color the same way the existing
 * line-art / 3D variants do.
 */

import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";

type Props = {
  code: ArchetypeCode;
  title?: string;
  className?: string;
};

type MarkProps = { title: string };

/** Shared SVG frame — 100×100 viewBox, currentColor strokes, rounded
 *  joins, and a thicker default strokeWidth than the line-art set so
 *  the marks read confidently at small sizes. */
function MarkFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/* ============================================================
 * Steward (C-P-C) — circle head, lantern flame above the crown
 * ============================================================ */
function StewardMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* flame above */}
      <path d="M 50 8 Q 46 16 50 22 Q 54 16 50 8 Z" fill="currentColor" stroke="none" />
      {/* head — circle */}
      <circle cx={50} cy={42} r={16} />
      {/* face anchor dot */}
      <circle cx={50} cy={42} r={2.2} fill="currentColor" stroke="none" />
      {/* shoulders — short trapezoid hint */}
      <path d="M 30 78 Q 30 64 50 62 Q 70 64 70 78" />
    </MarkFrame>
  );
}

/* ============================================================
 * Shepherd (C-P-L) — oval head, staff diagonal + 3-dot flock
 * ============================================================ */
function ShepherdMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* staff diagonal with crook */}
      <path d="M 80 14 L 64 80" />
      <path d="M 80 14 Q 86 14 86 22" />
      {/* head — oval */}
      <ellipse cx={42} cy={36} rx={14} ry={18} />
      {/* face anchor */}
      <circle cx={42} cy={36} r={2.2} fill="currentColor" stroke="none" />
      {/* shoulder line — open-armed gesture */}
      <path d="M 18 78 Q 28 62 42 60 Q 56 62 66 78" />
      {/* 3-dot flock — clustered low-right */}
      <circle cx={74} cy={86} r={2.6} fill="currentColor" stroke="none" />
      <circle cx={84} cy={84} r={2.2} fill="currentColor" stroke="none" />
      <circle cx={80} cy={92} r={2.2} fill="currentColor" stroke="none" />
    </MarkFrame>
  );
}

/* ============================================================
 * Conservator (C-S-C) — square head, compass cross below
 * ============================================================ */
function ConservatorMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* head — square (precision register) */}
      <rect x={32} y={20} width={36} height={36} rx={3} />
      {/* face anchor */}
      <circle cx={50} cy={38} r={2.2} fill="currentColor" stroke="none" />
      {/* shoulders */}
      <path d="M 22 84 L 32 64 M 78 84 L 68 64" />
      {/* compass cross — measured tools */}
      <path d="M 50 70 L 50 90 M 40 80 L 60 80" />
      <circle cx={50} cy={80} r={2.4} fill="currentColor" stroke="none" />
    </MarkFrame>
  );
}

/* ============================================================
 * Institution Builder (C-S-L) — rounded rectangle head, 3 pillars
 * ============================================================ */
function InstitutionBuilderMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* head — rounded rectangle (pillar-capital register) */}
      <rect x={32} y={16} width={36} height={32} rx={10} />
      {/* face anchor */}
      <circle cx={50} cy={32} r={2.2} fill="currentColor" stroke="none" />
      {/* architrave above pillars */}
      <path d="M 18 64 L 82 64" />
      {/* 3 pillars */}
      <path d="M 26 68 L 26 92 M 50 68 L 50 92 M 74 68 L 74 92" />
      {/* base line */}
      <path d="M 18 94 L 82 94" />
    </MarkFrame>
  );
}

/* ============================================================
 * Artisan (X-P-C) — diamond head, brush arc + paint dot
 * ============================================================ */
function ArtisanMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* head — diamond (off-axis creative) */}
      <path d="M 50 14 L 70 36 L 50 58 L 30 36 Z" />
      {/* face anchor */}
      <circle cx={50} cy={36} r={2.2} fill="currentColor" stroke="none" />
      {/* brush handle held to the side */}
      <path d="M 70 70 L 86 86" strokeWidth={2.4} />
      {/* brush head fan */}
      <path d="M 64 64 L 78 78" strokeWidth={3.6} opacity={0.7} />
      {/* paint stroke arc on the opposite side */}
      <path d="M 18 80 Q 28 74 38 80" opacity={0.8} />
      {/* paint dot */}
      <circle cx={20} cy={86} r={2.4} fill="currentColor" stroke="none" />
    </MarkFrame>
  );
}

/* ============================================================
 * Catalyst (X-P-L) — triangle head, megaphone-spark trail
 * ============================================================ */
function CatalystMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* head — triangle pointing up (forward kinetic) */}
      <path d="M 50 14 L 72 50 L 28 50 Z" />
      {/* face anchor */}
      <circle cx={50} cy={40} r={2.2} fill="currentColor" stroke="none" />
      {/* leaning shoulder/body */}
      <path d="M 30 80 Q 36 60 50 56 Q 60 62 60 70" />
      {/* spark trail — 4 dots fanning right */}
      <circle cx={70} cy={70} r={2.8} fill="currentColor" stroke="none" />
      <circle cx={80} cy={66} r={2.2} fill="currentColor" stroke="none" />
      <circle cx={86} cy={76} r={1.8} fill="currentColor" stroke="none" />
      <circle cx={90} cy={84} r={1.4} fill="currentColor" stroke="none" />
    </MarkFrame>
  );
}

/* ============================================================
 * Designer (X-S-C) — hexagon head, grid lines below
 * ============================================================ */
function DesignerMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* head — hexagon (geometric precision) */}
      <path d="M 50 14 L 68 24 L 68 46 L 50 56 L 32 46 L 32 24 Z" />
      {/* face anchor */}
      <circle cx={50} cy={35} r={2.2} fill="currentColor" stroke="none" />
      {/* shoulders */}
      <path d="M 28 80 L 38 64 M 72 80 L 62 64" />
      {/* drafting grid — 3 horizontal + 3 vertical */}
      <path d="M 24 70 L 76 70 M 24 80 L 76 80 M 24 90 L 76 90" opacity={0.55} />
      <path d="M 36 64 L 36 94 M 50 64 L 50 94 M 64 64 L 64 94" opacity={0.55} />
    </MarkFrame>
  );
}

/* ============================================================
 * Architect (X-S-L) — pentagon head, 3-node connected graph
 * ============================================================ */
function ArchitectMark({ title }: MarkProps) {
  return (
    <MarkFrame title={title}>
      {/* head — pentagon (systemic five-sided) */}
      <path d="M 50 12 L 70 26 L 62 50 L 38 50 L 30 26 Z" />
      {/* face anchor */}
      <circle cx={50} cy={32} r={2.2} fill="currentColor" stroke="none" />
      {/* shoulders */}
      <path d="M 26 80 Q 38 58 50 56 Q 62 58 74 80" />
      {/* node graph — 3 connected nodes orbiting low */}
      <path d="M 22 88 L 50 78 L 78 88 L 22 88 Z" opacity={0.45} />
      <circle cx={22} cy={88} r={3.2} fill="currentColor" stroke="none" />
      <circle cx={50} cy={78} r={3.2} fill="currentColor" stroke="none" />
      <circle cx={78} cy={88} r={3.2} fill="currentColor" stroke="none" />
    </MarkFrame>
  );
}

const MARK_MAP: Record<ArchetypeCode, React.ComponentType<MarkProps>> = {
  "C-P-C": StewardMark,
  "C-P-L": ShepherdMark,
  "C-S-C": ConservatorMark,
  "C-S-L": InstitutionBuilderMark,
  "X-P-C": ArtisanMark,
  "X-P-L": CatalystMark,
  "X-S-C": DesignerMark,
  "X-S-L": ArchitectMark,
};

/**
 * XQCharacterMark — entry point. Picks the per-archetype mark
 * subcomponent and wraps it in a flexbox div that takes the accent
 * color from the archetype identity, mirroring XQCharacter3D's
 * wrapper pattern so it slots into the same hosts cleanly.
 */
export function XQCharacterMark({ code, title, className }: Props) {
  const Inner = MARK_MAP[code];
  const identity = CHARACTERS[code];
  const accessibleTitle = title ?? `XQ archetype mark: ${identity.prop}`;
  return (
    <div
      className={className}
      style={{
        color: identity.accent,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Inner title={accessibleTitle} />
    </div>
  );
}
