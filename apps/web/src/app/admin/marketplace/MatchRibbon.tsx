"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { tierFor } from "@/lib/marketplace-match";

/**
 * Glowing dotted ribbon drawn on the ground between two world points,
 * representing a confirmed match. Built as a thin rectangle stretched
 * between the endpoints with a dashed canvas texture that scrolls along
 * the length each frame — reads as a flowing line of light.
 *
 * Render approach is a flat plane (not a tube) per the research's JRPG
 * note: "Earthbound/Chrono Trigger never lift connections off the
 * tilemap." Path stays glued to the ground.
 */

type Vec2 = { x: number; z: number };

type Props = {
  from: Vec2;
  to: Vec2;
  /** 0..100 resonance — drives both colour tier and dash speed. */
  score: number;
  /** Faded read when the user has selected something else. */
  dimmed?: boolean;
  /** When set, the ribbon's animation pauses (e.g. on hover for clarity). */
  paused?: boolean;
};

const TIER_COLORS: Record<ReturnType<typeof tierFor>, string> = {
  strong: "#fbad25", // admin accent
  fair: "#ffc864", // admin warn (lighter amber)
  weak: "#64c8ff", // info — distinguishes manual / weak overrides
};

/**
 * Build a small canvas with two repeated dashes — the texture pattern
 * is meant to tile along the ribbon's length. We use a soft amber glow
 * with a transparent background so the ground colour shows through
 * between dashes.
 */
function makeDashTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(c);

  // Dash 1: bright core + soft halo
  const drawDash = (cx: number) => {
    const grd = ctx.createRadialGradient(cx, 4, 0, cx, 4, 6);
    grd.addColorStop(0, color);
    grd.addColorStop(0.5, `${color}80`);
    grd.addColorStop(1, `${color}00`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(cx, 4, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.clearRect(0, 0, 32, 8);
  drawDash(8);
  drawDash(24);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter; // soft glow reads better with linear
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function MatchRibbon({ from, to, score, dimmed, paused }: Props) {
  const tier = tierFor(score);
  const color = TIER_COLORS[tier];

  const texture = useMemo(() => makeDashTexture(color), [color]);

  // Compute geometry once per endpoint pair. The plane is built along
  // the +X axis at ground level, then rotated/translated to span from
  // `from` to `to`. Width is constant (0.28 world units).
  const { length, midpoint, angle } = useMemo(() => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return {
      length: Math.sqrt(dx * dx + dz * dz),
      midpoint: { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 },
      angle: Math.atan2(dz, dx),
    };
  }, [from.x, from.z, to.x, to.z]);

  // Tile the dash pattern along the ribbon length so dashes have a
  // consistent visual size regardless of how far apart the endpoints
  // sit. ~1 dash pair per 1.3 world units feels balanced at the
  // current camera zoom.
  const repeatX = Math.max(2, length / 1.3);

  useEffect(() => {
    texture.repeat.set(repeatX, 1);
  }, [texture, repeatX]);

  // Animate the dash offset every frame for the "flowing" effect.
  // Speed increases with resonance — strong matches feel more alive.
  // Direction is from-to so the flow hints at a pairing arrow.
  const meshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = paused ? 0 : 0.4 + (score / 100) * 0.8; // units / sec
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      texture.offset.x = (texture.offset.x - dt * speed) % 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [texture, score, paused]);

  return (
    <mesh
      ref={meshRef}
      position={[midpoint.x, 0.03, midpoint.z]}
      rotation={[-Math.PI / 2, 0, -angle]}
    >
      <planeGeometry args={[length, 0.28]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        opacity={dimmed ? 0.18 : 0.9}
      />
    </mesh>
  );
}
