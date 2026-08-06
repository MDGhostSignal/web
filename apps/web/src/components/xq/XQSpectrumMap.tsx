"use client";

/**
 * XQSpectrumMap — 2D map of all 8 XQ archetypes with an optional
 * highlight for the user's position derived from their axis scores.
 *
 * Projection:
 *   - X axis (horizontal): Continuity (left) ↔ Change (right)
 *   - Y axis (vertical):   Person (top)      ↔ System (bottom)
 *   - Axis 3 (Craft ↔ Leverage) is encoded as "inside/outside" within
 *     each quadrant: Craft archetypes cluster nearer the centre of the
 *     map (intimate), Leverage archetypes push toward the outer
 *     corners (expansive).
 *
 * Two modes:
 *   - Browse (no `position`): all 8 archetypes shown evenly, neighbor
 *     edges drawn faintly. Used on the /xq-characters gallery.
 *   - Result (`position` + `highlight`): user's dot pulsed on the
 *     plane; their archetype card gets an emphatic ring; neighbours
 *     (1 axis flip away) glow softer. Wired into the quiz reveal.
 *
 * Anchors are hover-interactive: pointer-over lifts the avatar (translate
 * + drop-shadow) and surfaces a brief tooltip with the archetype's
 * tagline + a one-sentence summary.
 */

import { useState } from "react";

import {
  CHARACTERS,
  CHARACTER_ORDER,
  getNeighbors,
} from "@/lib/xq/characters";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import { XQCharacter } from "./XQCharacter";
import { XQCharacter3D } from "./XQCharacter3D";
import { XQCharacterMark } from "./XQCharacterMark";
import "./xq-spectrum-map.css";

/** Normalised position on each axis, in the range [-1, +1].
 *  axis1: +1 = Continuity, -1 = Change
 *  axis2: +1 = Person,     -1 = System
 *  axis3: +1 = Craft,      -1 = Leverage
 *  Easiest to derive from XQResult.details by computing
 *  `(score - opposingScore) / (score + opposingScore)`. */
export type SpectrumPosition = {
  axis1: number;
  axis2: number;
  axis3: number;
};

type Props = {
  /** Show the user's point on the map. Omit for browse mode. */
  position?: SpectrumPosition;
  /** The archetype code to ring on the map (typically the winning
   *  archetype from the user's result). */
  highlight?: ArchetypeCode;
  /** Compact mode shrinks character thumbnails. */
  compact?: boolean;
  /** Label above the result-mode point. Defaults to "YOU" (the quiz
   *  reveal); /invitation passes "YOUR BRAND" for its example read. */
  pointLabel?: string;
  /** Which character renderer to use for the anchor thumbnails.
   *  Defaults to "mark" (XQCharacterMark) — simplified logo-like
   *  silhouettes designed for these small ringed circles, where the
   *  more detailed line-art / 3D variants read as thin jittery noise.
   *  Pass "line-art" or "3d" on surfaces with room to breathe (the
   *  dedicated /xq-characters and /xq-characters2 galleries).
   *  String discriminator (rather than a component ref) so this prop
   *  is RSC-serializable when the map is rendered from a server
   *  component like /xq-characters2/page.tsx. */
  variant?: "mark" | "line-art" | "3d";
};

/* ====================================================================
 * Layout constants — fixed pixel positions inside a 900×560 viewBox.
 *
 * The 8 anchor points are laid out so Craft archetypes (axis3 = +1)
 * cluster nearer the centre and Leverage archetypes (axis3 = -1)
 * push outward. This keeps the cube's adjacency intuition intact
 * (neighbours are visually close) while flattening into 2D.
 * ==================================================================== */

const VIEWBOX_W = 900;
const VIEWBOX_H = 560;

const ANCHORS: Record<ArchetypeCode, { x: number; y: number }> = {
  // Top-Left quadrant — Continuity × Person
  "C-P-C": { x: 320, y: 190 }, // Steward (Craft, inner)
  "C-P-L": { x: 170, y: 110 }, // Shepherd (Leverage, outer)
  // Top-Right quadrant — Change × Person
  "X-P-C": { x: 580, y: 190 }, // Artisan (Craft, inner)
  "X-P-L": { x: 730, y: 110 }, // Catalyst (Leverage, outer)
  // Bottom-Left quadrant — Continuity × System
  "C-S-C": { x: 320, y: 370 }, // Conservator (Craft, inner)
  "C-S-L": { x: 170, y: 450 }, // Inst Builder (Leverage, outer)
  // Bottom-Right quadrant — Change × System
  "X-S-C": { x: 580, y: 370 }, // Designer (Craft, inner)
  "X-S-L": { x: 730, y: 450 }, // Architect (Leverage, outer)
};

/** Project a user position (axes in [-1, +1]) to a (x, y) point on
 *  the same plane the anchors sit on. The Craft↔Leverage axis is
 *  rendered as a radial drift away from the centre. */
function projectUser(p: SpectrumPosition) {
  const cx = VIEWBOX_W / 2;
  const cy = VIEWBOX_H / 2;

  // Axis 1 → horizontal. Continuity (+1) = left, Change (-1) = right.
  const baseX = cx - p.axis1 * 250;
  // Axis 2 → vertical. Person (+1) = up, System (-1) = down.
  const baseY = cy - p.axis2 * 150;

  // Axis 3 → radial drift. Leverage (-1) pushes outward from centre;
  // Craft (+1) pulls inward. Direction is (baseX - cx, baseY - cy)
  // normalised.
  const dx = baseX - cx;
  const dy = baseY - cy;
  const len = Math.hypot(dx, dy) || 1;
  const drift = -p.axis3 * 90; // Leverage outward, Craft inward.
  const x = baseX + (dx / len) * drift;
  const y = baseY + (dy / len) * drift;

  return { x, y };
}

/** First sentence of a multi-sentence description. Used to keep the
 *  hover tooltip compact without losing the archetype's essence. */
function firstSentence(text: string): string {
  const i = text.indexOf(". ");
  return i === -1 ? text : text.slice(0, i + 1);
}

export function XQSpectrumMap({
  position,
  highlight,
  compact,
  pointLabel = "YOU",
  variant = "mark",
}: Props) {
  const userPoint = position ? projectUser(position) : null;
  const neighbourSet = new Set(highlight ? getNeighbors(highlight) : []);
  const charSize = compact ? 56 : 76;
  const [hoveredCode, setHoveredCode] = useState<ArchetypeCode | null>(null);
  const CharacterRenderer =
    variant === "3d"
      ? XQCharacter3D
      : variant === "line-art"
        ? XQCharacter
        : XQCharacterMark;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="XQ archetype spectrum map — eight characters on a Continuity↔Change × Person↔System plane"
      width="100%"
      style={{ display: "block", maxWidth: "100%" }}
    >
      <title>XQ Archetype Spectrum</title>

      {/* Axis cross-hairs — subtle reference lines */}
      <g stroke="rgba(255,255,255,0.08)" strokeWidth={1}>
        <line x1={40} y1={VIEWBOX_H / 2} x2={VIEWBOX_W - 40} y2={VIEWBOX_H / 2} />
        <line x1={VIEWBOX_W / 2} y1={40} x2={VIEWBOX_W / 2} y2={VIEWBOX_H - 40} />
      </g>

      {/* Axis labels — small typographic labels, reduced from 11px
          to 9px so they read as quiet annotations not headlines. */}
      <g
        fill="rgba(255,255,255,0.5)"
        fontFamily="Inter, sans-serif"
        fontSize={9}
        fontWeight={600}
        letterSpacing={1.2}
        textAnchor="middle"
      >
        <text x={50} y={VIEWBOX_H / 2 - 8} textAnchor="start">
          ← CONTINUITY
        </text>
        <text x={VIEWBOX_W - 50} y={VIEWBOX_H / 2 - 8} textAnchor="end">
          CHANGE →
        </text>
        <text x={VIEWBOX_W / 2} y={32} textAnchor="middle">
          ↑ PERSON
        </text>
        <text x={VIEWBOX_W / 2} y={VIEWBOX_H - 20} textAnchor="middle">
          ↓ SYSTEM
        </text>
      </g>

      {/* Neighbour edges — drawn between archetypes that differ by
          exactly one axis. Faint by default; stronger when an edge
          touches the highlighted archetype. */}
      <g>
        {CHARACTER_ORDER.flatMap((code) =>
          getNeighbors(code)
            .filter((n) => n > code) // dedupe — only draw each edge once
            .map((n) => {
              const isLit =
                highlight && (code === highlight || n === highlight);
              return (
                <line
                  key={`${code}-${n}`}
                  x1={ANCHORS[code].x}
                  y1={ANCHORS[code].y}
                  x2={ANCHORS[n].x}
                  y2={ANCHORS[n].y}
                  stroke={isLit ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={isLit ? 1.4 : 1}
                  strokeDasharray={isLit ? "0" : "3 5"}
                />
              );
            }),
        )}
      </g>

      {/* Archetype anchors — each is a character thumbnail in a small
          framed circle with the persona name beneath. Hover lifts
          the whole group on the z-axis with a drop shadow + scale. */}
      {CHARACTER_ORDER.map((code) => {
        const a = ANCHORS[code];
        const c = CHARACTERS[code];
        const archetype = ARCHETYPES[code];
        const isHighlight = highlight === code;
        const isNeighbour = neighbourSet.has(code);
        const isHovered = hoveredCode === code;
        const ringR = charSize / 2 + 8;

        return (
          <g
            key={code}
            className={`xq-spectrum-anchor${isHovered ? " is-hovered" : ""}`}
            style={
              {
                ["--anchor-accent" as never]: c.accent,
                transformOrigin: `${a.x}px ${a.y}px`,
              } as React.CSSProperties
            }
            onMouseEnter={() => setHoveredCode(code)}
            onMouseLeave={() =>
              setHoveredCode((prev) => (prev === code ? null : prev))
            }
            tabIndex={0}
            role="button"
            aria-label={`${archetype.name} — ${archetype.tagline}`}
            onFocus={() => setHoveredCode(code)}
            onBlur={() =>
              setHoveredCode((prev) => (prev === code ? null : prev))
            }
          >
            {/* Glow disc behind the avatar */}
            <circle
              cx={a.x}
              cy={a.y}
              r={ringR + 10}
              fill={c.accent}
              opacity={isHighlight ? 0.22 : isNeighbour ? 0.1 : 0.04}
            />
            {/* Inner accent ring */}
            <circle
              cx={a.x}
              cy={a.y}
              r={ringR}
              fill="none"
              stroke={c.accent}
              strokeWidth={isHighlight ? 2.4 : 1.2}
              opacity={isHighlight ? 1 : isNeighbour ? 0.6 : 0.35}
            />
            {/* Character thumbnail — embedded via foreignObject so the
                existing XQCharacter component can render inside SVG */}
            <foreignObject
              x={a.x - charSize / 2}
              y={a.y - charSize / 2}
              width={charSize}
              height={charSize}
            >
              <div
                style={{
                  width: charSize,
                  height: charSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CharacterRenderer code={code} />
              </div>
            </foreignObject>
            {/* Name label */}
            <text
              x={a.x}
              y={a.y + ringR + 22}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize={isHighlight ? 14 : 12.5}
              fontWeight={isHighlight ? 700 : 600}
              fill={isHighlight ? c.accent : "#ffffff"}
            >
              {archetype.name}
            </text>
            {/* Code chip beneath the name */}
            <text
              x={a.x}
              y={a.y + ringR + 38}
              textAnchor="middle"
              fontFamily="Inter, ui-monospace, monospace"
              fontSize={10}
              letterSpacing={1.4}
              fill={isHighlight ? c.accent : "rgba(255,255,255,0.45)"}
              opacity={isHighlight ? 0.95 : 0.7}
            >
              {code}
            </text>
          </g>
        );
      })}

      {/* Hover tooltip — brief blurb about the hovered archetype.
          Flips above/below the anchor based on which row it sits
          in so it stays inside the visible map area. */}
      {hoveredCode && (() => {
        const a = ANCHORS[hoveredCode];
        const c = CHARACTERS[hoveredCode];
        const arc = ARCHETYPES[hoveredCode];
        const TOOLTIP_W = 260;
        // Height bumped to accommodate two lines of desc text without
        // clipping. foreignObject content gets cut at the box edge.
        const TOOLTIP_H = 110;
        const isTopRow = a.y < VIEWBOX_H / 2;
        const ringR = charSize / 2 + 8;
        // Place below the anchor for top-row archetypes (so it doesn't
        // run off the top edge), above for bottom-row.
        const tooltipY = isTopRow
          ? a.y + ringR + 50
          : a.y - ringR - 50 - TOOLTIP_H;
        // Clamp tooltipX so it never crosses the SVG bounds.
        const rawX = a.x - TOOLTIP_W / 2;
        const tooltipX = Math.max(
          12,
          Math.min(VIEWBOX_W - TOOLTIP_W - 12, rawX),
        );
        return (
          <foreignObject
            x={tooltipX}
            y={tooltipY}
            width={TOOLTIP_W}
            height={TOOLTIP_H}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="xq-spectrum-tooltip"
              style={
                { ["--tooltip-accent" as never]: c.accent } as React.CSSProperties
              }
            >
              <strong className="xq-spectrum-tooltip-name">{arc.name}</strong>
              <em className="xq-spectrum-tooltip-tagline">{arc.tagline}</em>
              <p className="xq-spectrum-tooltip-desc">
                {firstSentence(arc.desc)}
              </p>
            </div>
          </foreignObject>
        );
      })()}

      {/* User point — only rendered in result mode. Breathing halo +
          expanding ping ring (styles in xq-spectrum-map.css) around a
          solid dot at the user's projected coordinates. */}
      {userPoint && (
        <g>
          <circle
            className="xq-spectrum-user-halo"
            cx={userPoint.x}
            cy={userPoint.y}
            r={28}
            fill="#ffffff"
            opacity={0.08}
          />
          <circle
            className="xq-spectrum-user-ping"
            cx={userPoint.x}
            cy={userPoint.y}
            r={18}
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
          <circle
            cx={userPoint.x}
            cy={userPoint.y}
            r={16}
            fill="#ffffff"
            opacity={0.18}
          />
          <circle
            cx={userPoint.x}
            cy={userPoint.y}
            r={7}
            fill="#ffffff"
          />
          <text
            x={userPoint.x}
            y={userPoint.y - 22}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize={11}
            fontWeight={700}
            letterSpacing={1.4}
            fill="#ffffff"
          >
            {pointLabel}
          </text>
        </g>
      )}
    </svg>
  );
}
