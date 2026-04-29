"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  MarchingCube,
  MarchingCubes,
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
} from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Binary-star wow scene for the Values section. Two PBR-shaded spheres
 * orbit a shared centre on a tilted axis. Each sphere carries a point
 * light that illuminates the other across the orbit, and a centre
 * point light pulses softly. A single selective Bloom pass picks up
 * the emissive cores so the scene reads as luminous without paying
 * for a full HDR pipeline.
 *
 * Interactivity:
 *  - Auto-spin at a slow baseline (~12°/s).
 *  - Pointer-drag adds angular velocity to the orbit (horizontal drag
 *    spins, vertical drag tilts the orbital plane).
 *  - Release lets velocity decay via friction back to the auto-spin
 *    baseline → "fun to play with" inertia.
 *  - Hover slightly brightens both stars and the centre glow.
 *
 * Performance:
 *  - DPR capped at 1.25; sphere geometry at 24×24 segments.
 *  - Selective Bloom only (no global tone map / SMAA).
 *  - frameloop pauses via IntersectionObserver when the canvas
 *    leaves the viewport — the scene costs zero when scrolled past.
 *  - Reduced-motion users get a static, lit pose; drag still works.
 */
export type ValuesControl = {
  // Set by the section-level pointer handlers in page.tsx; read by the
  // BinaryScene useFrame loop. Refs (not state) so updates don't
  // re-render the Canvas.
  frozen: boolean;
  yaw: number; // user-driven yaw added on top of auto-tilt/spin
  pitch: number; // user-driven pitch added on top of auto-tilt
};

export type ValuesBinaryProps = {
  controlRef?: React.MutableRefObject<ValuesControl>;
};

export default function ValuesBinary({ controlRef }: ValuesBinaryProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  // Mount the canvas only when it enters the viewport. Once it does we
  // keep it mounted (don't tear down on scroll-out), but the canvas's
  // frameloop="demand" + invalidation behaviour means it stops drawing
  // once nothing changes — effectively idle when off-screen.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="valuesBinaryRoot" aria-hidden="true">
      {active ? (
        <Canvas
          dpr={[1, 1.25]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
          }}
          camera={{ position: [0, 0.6, 5.6], fov: 32 }}
        >
          <BinaryScene controlRef={controlRef} />
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.18}
              luminanceThreshold={0.78}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      ) : null}
    </div>
  );
}

/* =====================================================================
 * Scene
 * ===================================================================== */

// Animation constants. Each blob orbits its own circular path on its
// own plane; every orbit radius is bounded by MAX_RADIUS so no blob
// ever travels further than that distance from the centre. As the
// shared cycle approaches the merge moment, every radius scales to
// zero and all blobs fuse into a single droplet at the origin.
const MAX_RADIUS = 0.272;
const TILT_BASE = 0.32;
const MC_SCALE = 3.4;

type BlobSpec = {
  strength: number;
  baseRadius: number;
  speed: number; // angular velocity (rad/s)
  phase: number; // initial angle offset
  basisA: readonly [number, number, number]; // unit, ⊥ to basisB
  basisB: readonly [number, number, number];
};

// 7 metaballs: 2 main + 3 medium + 2 small. Every basisA/basisB pair
// is orthonormal, so blob position = basisA*cos + basisB*sin sweeps a
// true circle of radius `baseRadius * normSep`.
const BLOB_SPECS: BlobSpec[] = [
  // 2 main
  {
    strength: 0.145,
    baseRadius: MAX_RADIUS,
    speed: 0.2,
    phase: 0,
    basisA: [1, 0, 0],
    basisB: [0, 0.95, 0.31],
  },
  {
    strength: 0.145,
    baseRadius: MAX_RADIUS,
    speed: 0.2,
    phase: Math.PI,
    basisA: [1, 0, 0],
    basisB: [0, 0.95, 0.31],
  },
  // 3 medium
  {
    strength: 0.087,
    baseRadius: MAX_RADIUS * 0.85,
    speed: 0.34,
    phase: Math.PI / 3,
    basisA: [0.866, 0.5, 0],
    basisB: [0, 0, 1],
  },
  {
    strength: 0.087,
    baseRadius: MAX_RADIUS * 0.78,
    speed: 0.46,
    phase: (4 * Math.PI) / 3,
    basisA: [0.707, 0, 0.707],
    basisB: [0, 1, 0],
  },
  {
    strength: 0.087,
    baseRadius: MAX_RADIUS * 0.92,
    speed: 0.26,
    phase: (2 * Math.PI) / 3,
    basisA: [0, 0.866, 0.5],
    basisB: [1, 0, 0],
  },
  // 2 small
  {
    strength: 0.05,
    baseRadius: MAX_RADIUS * 0.65,
    speed: 0.56,
    phase: Math.PI / 2,
    basisA: [0.5, 0.866, 0],
    basisB: [0, 0, 1],
  },
  {
    strength: 0.05,
    baseRadius: MAX_RADIUS * 0.55,
    speed: 0.7,
    phase: (5 * Math.PI) / 4,
    basisA: [0.866, 0, 0.5],
    basisB: [-0.5, 0, 0.866],
  },
];

function BinaryScene({
  controlRef,
}: {
  controlRef?: React.MutableRefObject<ValuesControl>;
}) {
  const orbitRef = useRef<THREE.Group>(null);
  // One ref per metaball; each <MarchingCube> contributes to the
  // shared implicit surface, so when their orbits collapse to zero
  // radius they fuse into one droplet. Refs are kept in spec order.
  const blobRefs = useRef<(THREE.Group | null)[]>(
    BLOB_SPECS.map(() => null),
  );
  const lightARef = useRef<THREE.PointLight>(null);
  const lightBRef = useRef<THREE.PointLight>(null);
  const centerLightRef = useRef<THREE.PointLight>(null);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Animation state. The scene runs on its own time accumulator so
  // the section-level click handler can lerp the rate to zero (a slow
  // freeze) and back, decoupled from R3F's wall clock.
  const yaw = useRef(0);
  const sep = useRef(MAX_RADIUS);
  const tilt = useRef(TILT_BASE);
  const localTime = useRef(0);
  const speedFactor = useRef(1); // lerps to 0 when frozen, 1 otherwise

  useFrame((_state, dt) => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    // Ease the speed factor toward its target (0 frozen, 1 running) so
    // the freeze/resume is a slow lerp instead of an abrupt cut.
    const targetSpeed = controlRef?.current.frozen ? 0 : 1;
    const ease = 1 - Math.exp(-dt * 0.9); // ~1.1s time-constant
    speedFactor.current += (targetSpeed - speedFactor.current) * ease;

    localTime.current += dt * speedFactor.current;
    const t = localTime.current;

    if (!reduced) {
      const PERIOD = 50;
      const phase = (t % PERIOD) / PERIOD; // 0..1
      // Four-phase water-droplet cycle:
      //   0.00–0.40  drift apart (ease-out, slowing into max sep)
      //   0.40–0.50  hover at max separation
      //   0.50–0.80  pull-in (smoothstep — slow approach, accelerate,
      //              then decelerate into contact like surface tension)
      //   0.80–1.00  stay merged as a single droplet
      // At wrap (phase 1→0) sep is already 0, so the next cycle picks
      // up the drift-apart from the merged state with no jump.
      let normSep: number;
      if (phase < 0.4) {
        const p = phase / 0.4;
        normSep = 1 - Math.pow(1 - p, 2.2);
      } else if (phase < 0.5) {
        normSep = 1;
      } else if (phase < 0.8) {
        const p = (phase - 0.5) / 0.3;
        const eased = p * p * (3 - 2 * p); // smoothstep
        normSep = 1 - eased;
      } else {
        normSep = 0;
      }
      sep.current = MAX_RADIUS * normSep;
      tilt.current = TILT_BASE + 0.18 * Math.sin(t * 0.1);
      yaw.current += 0.04 * dt * speedFactor.current;
    } else {
      sep.current = MAX_RADIUS;
      tilt.current = TILT_BASE;
    }

    // User rotation (drag) sits on top of the auto-tilt/spin so the
    // viewer can grab and twist the frozen scene in 3D.
    const userYaw = controlRef?.current.yaw ?? 0;
    const userPitch = controlRef?.current.pitch ?? 0;
    orbit.rotation.x = tilt.current + userPitch;
    orbit.rotation.y = yaw.current + userYaw;

    // normSep is the cycle's "openness" — 1 = blobs at full radius,
    // 0 = all blobs collapsed to the origin and fused. Derived from
    // sep.current so the existing four-phase cycle drives every blob.
    const normSep = sep.current / MAX_RADIUS;
    const merged = reduced ? 0 : 1 - normSep;
    const rippleEnvelope = Math.min(1, merged * 1.4);

    BLOB_SPECS.forEach((spec, i) => {
      const ref = blobRefs.current[i];
      if (!ref) return;

      const angle = spec.phase + t * spec.speed;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const r = spec.baseRadius * normSep;

      // Per-blob wobble — phase-shifted by index so the merged
      // droplet shimmers instead of pulsing in lockstep.
      const wob = 0.018 * rippleEnvelope;
      const wx = Math.sin(t * (5.5 + i * 0.4) + i) * wob;
      const wy = Math.cos(t * (4.7 + i * 0.35) + i * 1.3) * wob;
      const wz = Math.sin(t * (3.1 + i * 0.25) + i * 0.7) * wob * 0.7;

      // Local position inside the marching-cubes volume. baseRadius
      // is in world units; divide by MC_SCALE for local coords.
      const x =
        (spec.basisA[0] * ca + spec.basisB[0] * sa) * r;
      const y =
        (spec.basisA[1] * ca + spec.basisB[1] * sa) * r;
      const z =
        (spec.basisA[2] * ca + spec.basisB[2] * sa) * r;

      ref.position.set(
        x / MC_SCALE + wx,
        y / MC_SCALE + wy,
        z / MC_SCALE + wz,
      );
    });

    // Point lights track the two main blobs' world positions so the
    // matte surface always has directional light. baseRadius is in
    // world units, so we don't divide here.
    const main0 = BLOB_SPECS[0];
    const main1 = BLOB_SPECS[1];
    const a0 = main0.phase + t * main0.speed;
    const a1 = main1.phase + t * main1.speed;
    const r0 = main0.baseRadius * normSep;
    const r1 = main1.baseRadius * normSep;
    if (lightARef.current) {
      lightARef.current.position.set(
        (main0.basisA[0] * Math.cos(a0) + main0.basisB[0] * Math.sin(a0)) * r0,
        (main0.basisA[1] * Math.cos(a0) + main0.basisB[1] * Math.sin(a0)) * r0,
        (main0.basisA[2] * Math.cos(a0) + main0.basisB[2] * Math.sin(a0)) * r0,
      );
    }
    if (lightBRef.current) {
      lightBRef.current.position.set(
        (main1.basisA[0] * Math.cos(a1) + main1.basisB[0] * Math.sin(a1)) * r1,
        (main1.basisA[1] * Math.cos(a1) + main1.basisB[1] * Math.sin(a1)) * r1,
        (main1.basisA[2] * Math.cos(a1) + main1.basisB[2] * Math.sin(a1)) * r1,
      );
    }

    const breath = 0.85 + 0.15 * Math.sin(t * 1.2);
    if (lightARef.current) lightARef.current.intensity = 2.6 * breath;
    if (lightBRef.current) lightBRef.current.intensity = 2.75 * breath;
    if (centerLightRef.current)
      centerLightRef.current.intensity = 0.56 * breath;
  });

  return (
    <>
      <ambientLight intensity={0.27} color="#dde0ec" />
      {/* Cool key fill from the upper-back-left — gives the dark grey
          metallic surface enough light to read its terminator and
          edge curve without flooding it. */}
      <directionalLight
        position={[-2, 4, -3]}
        intensity={0.27}
        color="#b8c0e0"
      />
      {/* Warm rim from behind + below so the silhouette catches a
          subtle warm edge against the page's dark background — adds
          depth without competing with the white key lights tracking
          the metaballs. */}
      <directionalLight
        position={[3, -2, -4]}
        intensity={0.17}
        color="#ffd8a8"
      />

      {/* Centre point light — sits at orbit's centre and pulses softly. */}
      <pointLight
        ref={centerLightRef}
        position={[0, 0, 0]}
        color="#ffffff"
        intensity={0.56}
        distance={3.4}
        decay={2}
      />

      <group ref={orbitRef}>
        {/* Marching-cubes metaballs. drei's <MarchingCubes> wraps
            three.js's MarchingCubes geometry; the surface is the
            implicit isosurface of the metaballs' summed scalar
            fields, so two close <MarchingCube> blobs naturally bridge
            and merge into one mesh — no hard swap, no snap. The
            ripple wobble in useFrame regenerates this mesh every
            frame, which reads as the merged droplet flowing.

            Material is a single liquid-mercury PBR — high metalness +
            low roughness + faint emissive so the bloom pass picks
            it up. Both metaballs share this material because the
            implicit surface is one mesh. */}
        <MarchingCubes
          resolution={96}
          maxPolyCount={60000}
          enableUvs={false}
          enableColors={false}
          scale={MC_SCALE}
        >
          <meshStandardMaterial
            color="#1a1a1e"
            roughness={0.85}
            metalness={0.04}
            emissive="#08080a"
            emissiveIntensity={0.3}
          />
          {BLOB_SPECS.map((spec, i) => (
            <MarchingCube
              key={i}
              ref={(node) => {
                blobRefs.current[i] = node;
              }}
              strength={spec.strength}
              subtract={6}
              position={[
                (spec.basisA[0] * Math.cos(spec.phase) +
                  spec.basisB[0] * Math.sin(spec.phase)) *
                  spec.baseRadius / MC_SCALE,
                (spec.basisA[1] * Math.cos(spec.phase) +
                  spec.basisB[1] * Math.sin(spec.phase)) *
                  spec.baseRadius / MC_SCALE,
                (spec.basisA[2] * Math.cos(spec.phase) +
                  spec.basisB[2] * Math.sin(spec.phase)) *
                  spec.baseRadius / MC_SCALE,
              ]}
            />
          ))}
        </MarchingCubes>

        {/* Point lights track the blob world positions (updated each
            frame in useFrame). They sit OUTSIDE the marching cubes
            volume since drei's <MarchingCube> doesn't accept arbitrary
            children — keeping lights as siblings of the parent gives
            them free positioning. */}
        <pointLight
          ref={lightARef}
          position={[MAX_RADIUS, 0, 0]}
          color="#ffffff"
          intensity={2.6}
          distance={6.5}
          decay={2}
        />
        <pointLight
          ref={lightBRef}
          position={[-MAX_RADIUS, 0, 0]}
          color="#fff4e8"
          intensity={2.75}
          distance={6.5}
          decay={2}
        />
      </group>
    </>
  );
}
