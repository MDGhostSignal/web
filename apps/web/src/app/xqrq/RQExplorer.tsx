"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  AUTH_AXIS,
  AXIS_LEN,
  HORIZON_AXIS,
  VALUES_AXIS,
  comboAt,
  type RQCombo,
} from "./rq-explorer-data";
import styles from "./rq-explorer.module.css";

/**
 * RQExplorer — one isometric 3D graph of every RQ combination.
 *
 * The three axes (Values, Authenticity, Horizon) are projected onto a
 * single plane, so all 6×6×6 = 216 combinations live in one cube of
 * points instead of six separate panels. Points are painted back-to-
 * front; hovering one shows a floating tooltip (portalled to <body>, so
 * its fixed position tracks the cursor) with the code and three-word
 * name. Each axis drives one colour channel, so the cube reads as a
 * colour space.
 */

// Isometric projection. Values → down-right, Horizon → down-left,
// Authenticity → straight up.
const STEP = 84;
const KX = STEP * 0.86;
const KY = STEP * 0.5;
const PAD = 72;
const OX = 5 * KX + PAD;
const OY = 5 * STEP + PAD;
export const BOARD_W = 10 * KX + 2 * PAD;
export const BOARD_H = 10 * STEP + 2 * PAD;

function project(vi: number, ai: number, hi: number) {
  return { x: (vi - hi) * KX + OX, y: (vi + hi) * KY - ai * STEP + OY };
}

type PlacedPoint = { combo: RQCombo; x: number; y: number };

// All 216 points, sorted back-to-front so nearer points paint on top.
const POINTS: PlacedPoint[] = (() => {
  const arr: Array<PlacedPoint & { near: number }> = [];
  for (let vi = 0; vi < AXIS_LEN; vi++) {
    for (let ai = 0; ai < AXIS_LEN; ai++) {
      for (let hi = 0; hi < AXIS_LEN; hi++) {
        const { x, y } = project(vi, ai, hi);
        arr.push({ combo: comboAt(vi, ai, hi), x, y, near: vi + hi - ai });
      }
    }
  }
  arr.sort((a, b) => a.near - b.near);
  return arr.map(({ combo, x, y }) => ({ combo, x, y }));
})();

// Axis rays from the origin corner. Each ray labels its far end (the
// positive pole — Formative / Structural / Long-Arc) and, backward past
// the origin, its negative pole (Implicit / Relational / Catalytic).
const ORIGIN = project(0, 0, 0);

type AnchoredLabel = { x: number; y: number; anchor: "start" | "middle" | "end" };
type AxisRay = {
  key: string;
  axis: typeof VALUES_AXIS;
  end: { x: number; y: number };
  pos: AnchoredLabel;
  neg: AnchoredLabel;
};

function makeRay(
  axis: typeof VALUES_AXIS,
  end: { x: number; y: number },
  posAnchor: AnchoredLabel["anchor"],
  negAnchor: AnchoredLabel["anchor"],
): AxisRay {
  const dx = end.x - ORIGIN.x;
  const dy = end.y - ORIGIN.y;
  const m = Math.hypot(dx, dy) || 1;
  const ux = dx / m;
  const uy = dy / m;
  return {
    key: axis.key,
    axis,
    end,
    pos: { x: end.x + ux * 34, y: end.y + uy * 34 + 6, anchor: posAnchor },
    // Pushed well past the shared origin corner so the three negative
    // poles read separately rather than stacking.
    neg: { x: ORIGIN.x - ux * 74, y: ORIGIN.y - uy * 74 + 6, anchor: negAnchor },
  };
}

const AXIS_RAYS: AxisRay[] = [
  makeRay(VALUES_AXIS, project(5, 0, 0), "start", "end"),
  makeRay(AUTH_AXIS, project(0, 5, 0), "middle", "middle"),
  makeRay(HORIZON_AXIS, project(0, 0, 5), "end", "start"),
];

// Bounding-box wireframe — the 8 corners and the 12 edges (pairs that
// differ on exactly one axis) that read as a 3D cube around the cloud.
const MAX = AXIS_LEN - 1;
const CUBE_CORNERS = (() => {
  const cs: Array<{ v: number; a: number; h: number; x: number; y: number }> = [];
  for (const v of [0, MAX])
    for (const a of [0, MAX])
      for (const h of [0, MAX]) {
        const p = project(v, a, h);
        cs.push({ v, a, h, x: p.x, y: p.y });
      }
  return cs;
})();
const CUBE_EDGES = (() => {
  const es: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
  for (let i = 0; i < CUBE_CORNERS.length; i++)
    for (let j = i + 1; j < CUBE_CORNERS.length; j++) {
      const a = CUBE_CORNERS[i];
      const b = CUBE_CORNERS[j];
      const diff =
        (a.v !== b.v ? 1 : 0) + (a.a !== b.a ? 1 : 0) + (a.h !== b.h ? 1 : 0);
      if (diff === 1) es.push([a, b]);
    }
  return es;
})();
// Floor plane (Authenticity = 0) for grounding, as an SVG points string.
const FLOOR = [
  project(0, 0, 0),
  project(MAX, 0, 0),
  project(MAX, 0, MAX),
  project(0, 0, MAX),
]
  .map((p) => `${p.x},${p.y}`)
  .join(" ");

// Ripple wave — slow, subtle. Speed in px/s, pulse width in seconds.
const RIPPLE_SPEED = 400;
const RIPPLE_PULSE = 0.7;
const RIPPLE_AMP = 0.55;

type Tip = {
  combo: RQCombo;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
};

function flip(x: number, y: number) {
  return {
    flipX: x > window.innerWidth - 340,
    flipY: y > window.innerHeight - 300,
  };
}

export function RQExplorer() {
  const [tip, setTip] = useState<Tip | null>(null);

  // Ripple state lives in refs so the wave animates via direct DOM
  // writes (a --pulse custom property per dot) without re-rendering 216
  // buttons every frame.
  const pointEls = useRef<Array<HTMLButtonElement | null>>([]);
  const ripple = useRef<{ ox: number; oy: number; t0: number | null } | null>(
    null,
  );
  const rafId = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    },
    [],
  );

  // `now` is the rAF timestamp (same clock as performance.now), used so
  // the animation reads time without an impure call in render scope.
  function tickRipple(now: number) {
    const r = ripple.current;
    if (!r) {
      rafId.current = null;
      return;
    }
    if (r.t0 == null) r.t0 = now;
    const elapsed = (now - r.t0) / 1000;
    let active = false;
    for (let i = 0; i < POINTS.length; i++) {
      const p = POINTS[i];
      const u = elapsed - Math.hypot(p.x - r.ox, p.y - r.oy) / RIPPLE_SPEED;
      let intensity = 0;
      if (u < 0) active = true;
      else if (u <= RIPPLE_PULSE) {
        intensity = Math.sin((Math.PI * u) / RIPPLE_PULSE) * RIPPLE_AMP;
        active = true;
      }
      pointEls.current[i]?.style.setProperty("--pulse", intensity.toFixed(3));
    }
    if (active) {
      rafId.current = requestAnimationFrame(tickRipple);
    } else {
      ripple.current = null;
      rafId.current = null;
    }
  }

  function startRipple(ox: number, oy: number) {
    ripple.current = { ox, oy, t0: null };
    if (rafId.current == null) rafId.current = requestAnimationFrame(tickRipple);
  }

  // Scale the fixed-size board down to fit its column (never up past 1:1).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / BOARD_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      onPointerLeave={() => setTip(null)}
      onPointerMove={(e) =>
        setTip((prev) =>
          prev
            ? { ...prev, x: e.clientX, y: e.clientY, ...flip(e.clientX, e.clientY) }
            : prev,
        )
      }
    >
      <div
        className={styles.fit}
        style={{ width: BOARD_W * scale, height: BOARD_H * scale }}
      >
      <div
        className={styles.board}
        style={{
          width: BOARD_W,
          height: BOARD_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        role="group"
        aria-label="RQ combinations across three axes"
      >
        <svg className={styles.axes} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
          <polygon points={FLOOR} className={styles.floor} />
          {CUBE_EDGES.map(([a, b], i) => (
            <line
              key={`edge-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={styles.cubeEdge}
            />
          ))}
          {AXIS_RAYS.map((r) => (
            <line
              key={r.axis.key}
              x1={ORIGIN.x}
              y1={ORIGIN.y}
              x2={r.end.x}
              y2={r.end.y}
              className={styles.axisLine}
            />
          ))}
          {AXIS_RAYS.map((r) => (
            <text
              key={`pos-${r.key}`}
              x={r.pos.x}
              y={r.pos.y}
              className={styles.axisLabelPos}
              textAnchor={r.pos.anchor}
            >
              {r.axis.posLabel}
            </text>
          ))}
          {AXIS_RAYS.map((r) => (
            <text
              key={`neg-${r.key}`}
              x={r.neg.x}
              y={r.neg.y}
              className={styles.axisLabelNeg}
              textAnchor={r.neg.anchor}
            >
              {r.axis.negLabel}
            </text>
          ))}
        </svg>

        {POINTS.map(({ combo, x, y }, i) => (
          <button
            type="button"
            key={combo.code}
            ref={(el) => {
              pointEls.current[i] = el;
            }}
            className={styles.point}
            style={{ left: x, top: y, background: combo.color }}
            onPointerEnter={(e) => {
              setTip({ combo, x: e.clientX, y: e.clientY, ...flip(e.clientX, e.clientY) });
              startRipple(x, y);
            }}
            onFocus={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTip({ combo, x: rect.right, y: rect.top, ...flip(rect.right, rect.top) });
            }}
            onBlur={() => setTip(null)}
            aria-label={`${combo.name} — RQ ${combo.code}`}
          />
        ))}
      </div>
      </div>

      {/* Floating tooltip — portalled to <body> so its fixed position is
          relative to the viewport, not a transformed ancestor. */}
      {tip &&
        createPortal(
          <div
            className={styles.tip}
            role="tooltip"
            style={{
              left: tip.x,
              top: tip.y,
              transform: `translate(${tip.flipX ? "calc(-100% - 16px)" : "16px"}, ${tip.flipY ? "calc(-100% - 16px)" : "16px"})`,
            }}
          >
            <span
              className={styles.tipSwatch}
              style={{ background: tip.combo.color }}
              aria-hidden="true"
            />
            <p className={styles.tipCode}>{tip.combo.code}</p>
            <h3 className={styles.tipName}>{tip.combo.name}</h3>
            <p className={styles.tipSummary}>{tip.combo.summary}</p>
            <dl className={styles.tipAxes}>
              {(
                [
                  [VALUES_AXIS, tip.combo.values],
                  [AUTH_AXIS, tip.combo.authenticity],
                  [HORIZON_AXIS, tip.combo.horizon],
                ] as const
              ).map(([axis, stop]) => (
                <div key={axis.key} className={styles.tipAxis}>
                  <dt className={styles.tipAxisName}>{axis.name}</dt>
                  <dd className={styles.tipAxisVal}>
                    <span className={styles.tipAxisLetter}>{stop.letter}</span>
                    {stop.word}
                  </dd>
                </div>
              ))}
            </dl>
          </div>,
          document.body,
        )}
    </div>
  );
}
