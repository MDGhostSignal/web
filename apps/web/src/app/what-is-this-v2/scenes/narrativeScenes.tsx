"use client";

import Image from "next/image";

import type { ChapterDef } from "../chapters";
import { PH } from "../placeholders";
import styles from "../scenes.module.css";
import { SceneCopy, SceneShell } from "./SceneShell";

type SceneProps = {
  chapter: ChapterDef;
  progress: number;
  isActive: boolean;
  runwayVh: number;
};

/** 00 — Landing: headline visible immediately; plate eases in (no black void). */
export function EntryScene(props: SceneProps) {
  const p = props.progress;
  // Rest state is already readable; scroll pushes the plate toward full bleed.
  const scale = 0.82 + p * 0.55;
  const plateOpacity = 0.55 + p * 0.45;

  return (
    <SceneShell {...props} stageClassName={styles.stageEntry}>
      <div
        className={styles.entryPlate}
        style={{
          transform: `scale(${scale})`,
          opacity: plateOpacity,
        }}
      >
        <Image src={PH.violet} alt="" fill unoptimized className={styles.fillImg} />
      </div>
      <div className={styles.copyOverlay}>
        <SceneCopy chapter={props.chapter} />
      </div>
    </SceneShell>
  );
}

/** 01 — Wander: multi-speed horizontal world strip (camera walks). */
export function WanderScene(props: SceneProps) {
  const p = props.progress;
  return (
    <SceneShell {...props} stageClassName={styles.stageWander}>
      <div className={styles.wanderWorld} aria-hidden="true">
        <div
          className={`${styles.wanderLayer} ${styles.wanderFar}`}
          style={{ transform: `translate3d(${-p * 18}%, 0, 0)` }}
        >
          <Image src={PH.blue} alt="" width={900} height={500} unoptimized />
          <Image src={PH.violet} alt="" width={900} height={500} unoptimized />
        </div>
        <div
          className={`${styles.wanderLayer} ${styles.wanderMid}`}
          style={{ transform: `translate3d(${-p * 42}%, 0, 0)` }}
        >
          <Image src={PH.magenta} alt="" width={520} height={640} unoptimized />
          <Image src={PH.cyan} alt="" width={520} height={640} unoptimized />
          <Image src={PH.lime} alt="" width={520} height={640} unoptimized />
        </div>
        <div
          className={`${styles.wanderLayer} ${styles.wanderNear}`}
          style={{ transform: `translate3d(${-p * 70}%, ${p * 6}%, 0) scale(${1 + p * 0.15})` }}
        >
          <Image src={PH.orange} alt="" width={380} height={480} unoptimized />
          <Image src={PH.yellow} alt="" width={380} height={480} unoptimized />
        </div>
      </div>
      <SceneCopy chapter={props.chapter} className={styles.copyCorner} />
    </SceneShell>
  );
}

/** 02 — Profile: giant cropped portrait that zooms/crops vs text column. */
export function ProfileScene(props: SceneProps) {
  const p = props.progress;
  return (
    <SceneShell {...props} stageClassName={styles.stageProfile}>
      <div className={styles.profileGrid}>
        <div
          className={styles.profileCrop}
          style={{
            clipPath: `inset(${12 - p * 10}% ${8 - p * 6}% ${10 - p * 8}% ${p * 4}% round 0)`,
            transform: `scale(${1.05 + p * 0.35}) translate(${p * -4}%, ${p * 2}%)`,
          }}
        >
          <Image src={PH.orange} alt="" fill unoptimized className={styles.fillImg} />
        </div>
        <SceneCopy chapter={props.chapter} className={styles.profileCopy} />
      </div>
    </SceneShell>
  );
}

/** 03 — Approach: nested depth frames rushing toward the camera. */
export function ApproachScene(props: SceneProps) {
  const p = props.progress;
  const frames = [
    { src: PH.red, z: 1, base: 0.45 },
    { src: PH.blue, z: 2, base: 0.65 },
    { src: PH.violet, z: 3, base: 0.85 },
    { src: PH.cyan, z: 4, base: 1.05 },
  ];

  return (
    <SceneShell {...props} stageClassName={styles.stageApproach}>
      <div className={styles.approachTunnel} aria-hidden="true">
        {frames.map((f, i) => {
          const scale = f.base + p * (1.1 + i * 0.25);
          const opacity = Math.max(0, 1 - Math.abs(scale - 1.2) * 0.7);
          return (
            <div
              key={f.src}
              className={styles.approachFrame}
              style={{
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                zIndex: f.z,
                borderColor: i === frames.length - 1 ? "#b8ff00" : "#000",
              }}
            >
              <Image src={f.src} alt="" fill unoptimized className={styles.fillImg} />
            </div>
          );
        })}
      </div>
      <SceneCopy
        chapter={props.chapter}
        className={styles.copyCenter}
      />
    </SceneShell>
  );
}

/** 04 — Intimate: rising “hand” plate + liquid wash across copy. */
export function IntimateScene(props: SceneProps) {
  const p = props.progress;
  return (
    <SceneShell {...props} stageClassName={styles.stageIntimate}>
      <div
        className={styles.intimateHand}
        style={{
          transform: `translate3d(${-10 + p * 18}%, ${40 - p * 55}%, 0) rotate(${-18 + p * 22}deg)`,
        }}
      >
        <Image src={PH.cyan} alt="" width={520} height={650} unoptimized />
      </div>
      <div
        className={styles.intimateWash}
        style={{
          clipPath: `polygon(0 ${100 - p * 100}%, 100% ${90 - p * 80}%, 100% 100%, 0 100%)`,
          opacity: 0.35 + p * 0.45,
        }}
        aria-hidden="true"
      />
      <div
        className={styles.intimateOrb}
        style={{ transform: `scale(${0.4 + p * 1.1})`, opacity: p }}
      >
        <Image src={PH.magenta} alt="" fill unoptimized className={styles.fillImg} />
      </div>
      <SceneCopy chapter={props.chapter} className={styles.copyCorner} />
    </SceneShell>
  );
}

/** 06 — Transition: plates shatter outward (clip + scatter). */
export function TransitionScene(props: SceneProps) {
  const p = props.progress;
  const shards = [
    { src: PH.yellow, x: -35, y: -20, r: -18 },
    { src: PH.red, x: 30, y: -28, r: 14 },
    { src: PH.lime, x: -22, y: 32, r: 22 },
    { src: PH.blue, x: 38, y: 24, r: -12 },
  ];

  return (
    <SceneShell {...props} stageClassName={styles.stageTransition}>
      <div className={styles.transitionStack} aria-hidden="true">
        {shards.map((s, i) => (
          <div
            key={s.src}
            className={styles.transitionShard}
            style={{
              transform: `translate(${s.x * p}vw, ${s.y * p}vh) rotate(${s.r * p * 2}deg) scale(${1 - p * 0.15})`,
              opacity: 1 - p * 0.35,
              zIndex: i + 1,
            }}
          >
            <Image src={s.src} alt="" width={280} height={340} unoptimized />
          </div>
        ))}
      </div>
      <div
        className={styles.transitionCrack}
        style={{ transform: `scaleX(${p})` }}
        aria-hidden="true"
      />
      <SceneCopy chapter={props.chapter} className={styles.copyCenter} />
    </SceneShell>
  );
}

/** 07 — Monument: look-up cathedral — tall stack rises past the camera. */
export function MonumentScene(props: SceneProps) {
  const p = props.progress;
  const panels = [PH.blue, PH.violet, PH.cyan, PH.magenta, PH.blue];

  return (
    <SceneShell {...props} stageClassName={styles.stageMonument}>
      <div
        className={styles.monumentShaft}
        style={{ transform: `translate3d(-50%, ${20 - p * 110}%, 0)` }}
        aria-hidden="true"
      >
        {panels.map((src, i) => (
          <div key={`${src}-${i}`} className={styles.monumentPanel}>
            <Image src={src} alt="" width={720} height={420} unoptimized />
          </div>
        ))}
      </div>
      <SceneCopy chapter={props.chapter} className={styles.copyFloating} />
    </SceneShell>
  );
}

/** 11 — Scale: wide panorama pans horizontally. */
export function ScaleScene(props: SceneProps) {
  const p = props.progress;
  return (
    <SceneShell {...props} stageClassName={styles.stageScale}>
      <div
        className={styles.scalePanorama}
        style={{ transform: `translate3d(${-p * 45}%, 0, 0) scale(${1.05 + p * 0.2})` }}
        aria-hidden="true"
      >
        <Image src={PH.red} alt="" width={900} height={700} unoptimized />
        <Image src={PH.blue} alt="" width={900} height={700} unoptimized />
        <Image src={PH.violet} alt="" width={900} height={700} unoptimized />
      </div>
      <SceneCopy chapter={props.chapter} className={styles.copyBottom} />
    </SceneShell>
  );
}

/** 12 — Collection: grid assembles from center outward. */
export function CollectionScene(props: SceneProps) {
  const p = props.progress;
  const cells = [
    PH.lime, PH.magenta, PH.cyan,
    PH.orange, PH.yellow, PH.violet,
    PH.red, PH.blue, PH.lime,
  ];

  return (
    <SceneShell {...props} stageClassName={styles.stageCollection}>
      <div className={styles.collectionGrid} aria-hidden="true">
        {cells.map((src, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const dx = (col - 1) * 40;
          const dy = (row - 1) * 40;
          const appear = Math.min(1, Math.max(0, (p - i * 0.06) / 0.25));
          return (
            <div
              key={`${src}-${i}`}
              className={styles.collectionCell}
              style={{
                transform: `translate(${dx * (1 - appear)}%, ${dy * (1 - appear)}%) scale(${0.4 + appear * 0.6})`,
                opacity: appear,
              }}
            >
              <Image src={src} alt="" width={220} height={260} unoptimized />
            </div>
          );
        })}
      </div>
      <SceneCopy chapter={props.chapter} className={styles.copyBottom} />
    </SceneShell>
  );
}

