"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import styles from "./page.module.css";

/** Locked shorts from docs/XQ_ARCHETYPE_COPY.md. */
const SHORT: Record<ArchetypeCode, string> = {
  "C-P-C":
    "You belong with people who protect what is good and take their time making it.",
  "C-P-L":
    "You belong with people who want more people included, without weakening what they already have.",
  "C-S-C":
    "You belong with people who care that the work is done right, and that it stays that way.",
  "C-S-L":
    "You belong with people who want to build something that lasts longer than one project.",
  "X-P-C":
    "You belong with people who change things by making them better and more personal.",
  "X-P-L": "You belong with people who can get others to care, and to move with them.",
  "X-S-C": "You belong with people who fix a broken way of working by redesigning it.",
  "X-S-L": "You belong with the people building a world that has room for you in it.",
};

/**
 * Flat item glyphs, one stroke, no fill. Steward is a shield, Shepherd
 * a crook. The other six are a compass, a gate, a brush, a horn, a set
 * square, and a key.
 */
export function ItemIcon({ code }: { code: ArchetypeCode }) {
  const pen = {
    fill: "none",
    stroke: "#141414",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (code) {
    case "C-P-C":
      return (
        <path
          {...pen}
          d="M12 2.8 20 6.2v6c0 4.6-3.4 7.6-8 9.6-4.6-2-8-5-8-9.6v-6L12 2.8z"
        />
      );
    case "C-P-L":
      return <path {...pen} d="M9 22V9.5C9 4 18 4 18 9.5" />;
    case "C-S-C":
      return (
        <>
          <circle {...pen} cx="12" cy="14" r="6.2" />
          <path {...pen} d="M12 2.4 15.4 8.2H8.6L12 2.4z" />
        </>
      );
    case "C-S-L":
      return <path {...pen} d="M4.5 7h15M8 7v13M16 7v13M5 20h14" />;
    case "X-P-C":
      return <path {...pen} d="M7 21.5 14.5 9.5 19 3.5l3 2.6-5.2 5.2" />;
    case "X-P-L":
      return <path {...pen} d="M3.5 14.5h8M3.5 12v5M11.5 14.5 20 8.5v9.5L11.5 14.5z" />;
    case "X-S-C":
      return <path {...pen} d="M5 19V5.5L19.5 19H5z" />;
    case "X-S-L":
      return (
        <path {...pen} d="M8 9.2a3.4 3.4 0 1 1 2.2 3.2L20 20.2M15.2 16.2v3" />
      );
    default:
      return null;
  }
}

const VIEW_W = 480;
const VIEW_H = 214;
const ICON = 13;

/** Craft sits nearer the centre. Scale sits toward the corners. */
const ANCHORS: Record<ArchetypeCode, { x: number; y: number }> = {
  "C-P-L": { x: 122, y: 52 },
  "C-P-C": { x: 182, y: 80 },
  "X-P-C": { x: 298, y: 80 },
  "X-P-L": { x: 358, y: 52 },
  "C-S-L": { x: 122, y: 158 },
  "C-S-C": { x: 182, y: 130 },
  "X-S-C": { x: 298, y: 130 },
  "X-S-L": { x: 358, y: 158 },
};

const RING = 10;

/** Dotted segments between icons that share a row or a column. */
const GRID: Array<[number, number, number, number]> = [
  [122, 52, 358, 52],
  [182, 80, 298, 80],
  [182, 130, 298, 130],
  [122, 158, 358, 158],
  [122, 52, 122, 158],
  [182, 80, 182, 130],
  [298, 80, 298, 130],
  [358, 52, 358, 158],
];

function insetSegment(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = (dx / length) * RING;
  const uy = (dy / length) * RING;
  return { x1: x1 + ux, y1: y1 + uy, x2: x2 - ux, y2: y2 - uy };
}

const ORDER: ArchetypeCode[] = [
  "C-P-L",
  "C-P-C",
  "X-P-C",
  "X-P-L",
  "C-S-L",
  "C-S-C",
  "X-S-C",
  "X-S-L",
];

type Tip = {
  code: ArchetypeCode;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
};

function place(x: number, y: number) {
  return {
    flipX: x > window.innerWidth - 360,
    flipY: y > window.innerHeight - 200,
  };
}

export function PreviewMap() {
  const [hover, setHover] = useState<Tip | null>(null);

  function show(code: ArchetypeCode, x: number, y: number) {
    setHover({ code, x, y, ...place(x, y) });
  }

  return (
    <div className={styles.mapWrap}>
      <svg
        className={styles.mapSvg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Eight archetype symbols on a Continuity and Change map"
      >
        <g
          className={styles.mapGrid}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeLinecap="round"
          strokeDasharray="0.45 2.4"
        >
          {GRID.map(([x1, y1, x2, y2]) => {
            const line = insetSegment(x1, y1, x2, y2);
            return (
              <line
                key={`${x1}-${y1}-${x2}-${y2}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
              />
            );
          })}
        </g>
        <g className={styles.mapAxis} fill="none" stroke="currentColor" strokeWidth="0.5">
          <line x1="96" y1="105" x2="384" y2="105" />
          <line x1="240" y1="36" x2="240" y2="186" />
        </g>
        <g className={styles.mapLabel} fontSize="4">
          <text x="8" y="100">
            Continuity
          </text>
          <text x="472" y="100" textAnchor="end">
            Change
          </text>
          <text x="240" y="22" textAnchor="middle">
            Person
          </text>
          <text x="240" y="206" textAnchor="middle">
            System
          </text>
        </g>
        {ORDER.map((code) => {
          const anchor = ANCHORS[code];
          const active = hover?.code === code;
          return (
            <g
              key={code}
              className={active ? `${styles.mapHit} ${styles.mapHitUp}` : styles.mapHit}
              role="button"
              tabIndex={0}
              aria-label={`${ARCHETYPES[code].name}. ${SHORT[code]}`}
              onPointerEnter={(event) => show(code, event.clientX, event.clientY)}
              onPointerMove={(event) => show(code, event.clientX, event.clientY)}
              onPointerLeave={() => setHover((prev) => (prev?.code === code ? null : prev))}
              onFocus={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                show(code, rect.right, rect.top);
              }}
              onBlur={() => setHover((prev) => (prev?.code === code ? null : prev))}
            >
              <circle cx={anchor.x} cy={anchor.y} r="16" fill="transparent" stroke="none" />
              <circle
                className={styles.mapIcon}
                cx={anchor.x}
                cy={anchor.y}
                r="10"
                stroke="#141414"
                strokeWidth={active ? 1 : 0.7}
              />
              <svg
                x={anchor.x - ICON / 2}
                y={anchor.y - ICON / 2}
                width={ICON}
                height={ICON}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <ItemIcon code={code} />
              </svg>
            </g>
          );
        })}
      </svg>
      {hover
        ? createPortal(
            <div
              className={styles.mapTip}
              role="tooltip"
              style={{
                left: hover.x,
                top: hover.y,
                transform: `translate(${hover.flipX ? "calc(-100% - 16px)" : "16px"}, ${hover.flipY ? "calc(-100% - 16px)" : "16px"})`,
              }}
            >
              <p className={styles.mapTipName}>{ARCHETYPES[hover.code].name}</p>
              <p className={styles.mapTipText}>{SHORT[hover.code]}</p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
