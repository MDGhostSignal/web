"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { ChapterDef } from "../chapters";
import { PH, SELECT_OPTIONS } from "../placeholders";
import styles from "../scenes.module.css";
import { SceneCopy, SceneShell } from "./SceneShell";

type SceneProps = {
  chapter: ChapterDef;
  progress: number;
  isActive: boolean;
  runwayVh: number;
};

/** 05 — Portal: circular iris reveal; hold expands the aperture. */
export function PortalScene(props: SceneProps) {
  const [hold, setHold] = useState(0);
  const holding = useRef(false);

  useEffect(() => {
    let id = 0;
    const loop = () => {
      setHold((h) => {
        if (holding.current) return Math.min(1, h + 0.03);
        return Math.max(0, h - 0.035);
      });
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const p = props.progress;
  const aperture = 12 + hold * 55 + p * 8;
  const open = hold > 0.92;

  return (
    <SceneShell {...props} stageClassName={styles.stagePortal}>
      {/* Closed world: dark field. Iris punches a hole into the bright beyond. */}
      <div className={styles.portalWorld} aria-hidden="true">
        <Image src={PH.blue} alt="" fill unoptimized className={styles.fillImg} />
        <div className={styles.portalDim} />
      </div>

      <div
        className={styles.portalIris}
        style={{ clipPath: `circle(${aperture}% at 50% 48%)` }}
      >
        <Image src={PH.lime} alt="" fill unoptimized className={styles.fillImg} />
        <div className={styles.portalInnerGrid}>
          <Image src={PH.magenta} alt="" width={180} height={220} unoptimized />
          <Image src={PH.yellow} alt="" width={180} height={220} unoptimized />
          <Image src={PH.cyan} alt="" width={180} height={220} unoptimized />
        </div>
      </div>

      <button
        type="button"
        className={styles.portalHold}
        style={{ transform: `scale(${0.9 + hold * 0.2})` }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          holding.current = true;
        }}
        onPointerUp={() => {
          holding.current = false;
        }}
        onPointerCancel={() => {
          holding.current = false;
        }}
        aria-pressed={open}
      >
        {open ? "OPEN" : `HOLD ${Math.round(hold * 100)}%`}
      </button>

      <SceneCopy chapter={props.chapter} className={styles.copyCorner} />
    </SceneShell>
  );
}

/** 08 — Select: perspective fan / deck (Notturno bottle stage). */
export function SelectScene(props: SceneProps) {
  const [active, setActive] = useState(1);
  const p = props.progress;

  return (
    <SceneShell {...props} stageClassName={styles.stageSelect}>
      <div
        className={styles.selectStage}
        style={{ perspective: "900px", opacity: 0.35 + p * 0.65 }}
      >
        {SELECT_OPTIONS.map((opt, i) => {
          const d = i - active;
          const selected = i === active;
          return (
            <button
              key={opt.id}
              type="button"
              className={styles.selectFanCard}
              data-selected={selected ? "true" : "false"}
              style={{
                transform: `
                  translate(-50%, -50%)
                  translateX(${d * 28}%)
                  translateZ(${selected ? 80 : -Math.abs(d) * 60}px)
                  rotateY(${d * -18}deg)
                  scale(${selected ? 1.08 : 0.82})
                `,
                zIndex: 10 - Math.abs(d),
              }}
              onClick={() => setActive(i)}
              aria-pressed={selected}
            >
              <Image
                src={PH[opt.key]}
                alt={opt.label}
                width={240}
                height={300}
                unoptimized
              />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.selectCopyCol}>
        <SceneCopy chapter={props.chapter} />
        <p className={styles.hint}>
          Selected: <strong>{SELECT_OPTIONS[active]?.label}</strong>
        </p>
      </div>
    </SceneShell>
  );
}

/** 09 — Pour: source tilts, stream falls, vessel fills (full-bleed). */
export function PourScene(props: SceneProps) {
  const [fill, setFill] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdRef = useRef(false);

  useEffect(() => {
    let id = 0;
    const loop = () => {
      setFill((f) => {
        if (holdRef.current) return Math.min(1, f + 0.018);
        return Math.max(0, f - 0.006);
      });
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const p = props.progress;
  const stream = holding || fill > 0.04;

  return (
    <SceneShell {...props} stageClassName={styles.stagePour}>
      <div className={styles.pourLayout}>
        <div className={styles.pourCopy}>
          <SceneCopy chapter={props.chapter} />
          <p className={styles.hint}>
            {fill > 0.98 ? "Full — locked" : "Hold the vessel to pour"}
          </p>
        </div>

        <div className={styles.pourRig}>
          <div
            className={styles.pourBottle}
            style={{
              transform: `translateY(${(1 - p) * 30}px) rotate(${8 + fill * 28}deg)`,
            }}
          >
            <Image src={PH.yellow} alt="" width={160} height={200} unoptimized />
          </div>
          <div
            className={styles.pourBeam}
            style={{
              opacity: stream ? 0.4 + fill * 0.6 : 0,
              height: `${15 + fill * 55}%`,
            }}
          />
          <button
            type="button"
            className={styles.pourGlass}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              holdRef.current = true;
              setHolding(true);
            }}
            onPointerUp={() => {
              holdRef.current = false;
              setHolding(false);
            }}
            onPointerCancel={() => {
              holdRef.current = false;
              setHolding(false);
            }}
            aria-label={`Vessel ${Math.round(fill * 100)} percent`}
          >
            <Image src={PH.orange} alt="" width={200} height={260} unoptimized />
            <span
              className={styles.pourLevel}
              style={{ transform: `scaleY(${fill})` }}
            />
            <em>{Math.round(fill * 100)}%</em>
          </button>
        </div>
      </div>
    </SceneShell>
  );
}

const VORTEX_ITEMS = [
  { key: "magenta" as const, r: 130, s: 0.65, size: 100 },
  { key: "cyan" as const, r: 180, s: -0.5, size: 120 },
  { key: "lime" as const, r: 220, s: 0.38, size: 90 },
  { key: "violet" as const, r: 150, s: -0.8, size: 110 },
  { key: "orange" as const, r: 200, s: 0.48, size: 95 },
  { key: "yellow" as const, r: 250, s: -0.32, size: 85 },
];

function vortexPose(
  i: number,
  item: (typeof VORTEX_ITEMS)[number],
  t: number,
  p: number,
  mouse: { x: number; y: number },
  grabbed: number | null,
) {
  const angle = t * item.s + (i / VORTEX_ITEMS.length) * Math.PI * 2;
  const pull = grabbed === i ? 0.6 : 0.14 * p;
  const ox = Math.cos(angle) * item.r * (0.75 + p * 0.35);
  const oy = Math.sin(angle) * item.r * (0.55 + p * 0.4);
  const x = Math.round(ox * (1 - pull) + mouse.x * pull);
  const y = Math.round(oy * (1 - pull) + mouse.y * pull);
  const rot = Math.round(angle * 24 * 1000) / 1000;
  return { x, y, rot };
}

/** 10 — Vortex: full-stage orbit field with cursor gravity. */
export function VortexScene(props: SceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);
  const [grabbed, setGrabbed] = useState<number | null>(null);
  // Defer orbit math until after mount so SSR HTML matches the first client paint.
  const [live, setLive] = useState(false);

  useEffect(() => {
    let id = 0;
    let f = 0;
    const boot = requestAnimationFrame(() => {
      setLive(true);
      const loop = () => {
        f += 1;
        if (f % 2 === 0) setTick((t) => t + 1);
        id = requestAnimationFrame(loop);
      };
      id = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(boot);
      cancelAnimationFrame(id);
    };
  }, []);

  const p = props.progress;
  const t = live ? tick / 60 : 0;

  return (
    <SceneShell {...props} stageClassName={styles.stageVortex}>
      <div
        ref={rootRef}
        className={styles.vortexField}
        onPointerMove={(e) => {
          const rect = rootRef.current?.getBoundingClientRect();
          if (!rect) return;
          setMouse({
            x: e.clientX - rect.left - rect.width / 2,
            y: e.clientY - rect.top - rect.height / 2,
          });
        }}
      >
        <div
          className={styles.vortexCore}
          style={{
            transform: `translate(-50%, -50%) scale(${(0.7 + p * 0.6).toFixed(3)})`,
          }}
        />
        {VORTEX_ITEMS.map((item, i) => {
          const { x, y, rot } = vortexPose(i, item, t, p, mouse, grabbed);
          return (
            <button
              key={item.key}
              type="button"
              className={styles.vortexPlate}
              data-grabbed={grabbed === i ? "true" : "false"}
              style={{
                width: `${item.size}px`,
                height: `${item.size * 1.25}px`,
                transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`,
              }}
              onClick={() => setGrabbed((g) => (g === i ? null : i))}
              aria-pressed={grabbed === i}
            >
              <Image
                src={PH[item.key]}
                alt=""
                fill
                unoptimized
                className={styles.fillImg}
              />
            </button>
          );
        })}
      </div>
      <SceneCopy chapter={props.chapter} className={styles.copyCorner} />
      <p className={styles.hintCorner}>
        {grabbed == null
          ? "Move · click to latch"
          : `Latched: ${VORTEX_ITEMS[grabbed].key}`}
      </p>
    </SceneShell>
  );
}

/** 13 — CTA: product shelf rises; actions as final beat. */
export function CtaScene(props: SceneProps) {
  const p = props.progress;
  return (
    <SceneShell {...props} stageClassName={styles.stageCta}>
      <div
        className={styles.ctaShelf}
        style={{ transform: `translateY(${(1 - p) * 40}%)` }}
        aria-hidden="true"
      >
        <Image src={PH.violet} alt="" width={200} height={260} unoptimized />
        <Image src={PH.orange} alt="" width={200} height={260} unoptimized />
        <Image src={PH.lime} alt="" width={200} height={260} unoptimized />
      </div>
      <div className={styles.ctaCopy}>
        <SceneCopy chapter={props.chapter} />
        {props.chapter.actions ? (
          <div className={styles.ctaActions}>
            {props.chapter.actions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className={a.primary ? styles.btnPrimary : styles.btnGhost}
              >
                {a.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </SceneShell>
  );
}
