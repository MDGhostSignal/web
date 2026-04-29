"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * R3F replacement for the CSS-3D orbiting moon. Three real PBR
 * spheres orbit the harmony sun on independent planes at different
 * sizes and speeds, so dragging the scene reveals genuine 3D forms
 * (the previous CSS divs read as flat circles from the side).
 *
 * Controlled by a single ref shared with the section-level pointer
 * handlers in page.tsx — see ValuesBinary for the same pattern.
 */

export type HarmonyControl = {
  yaw: number; // user-driven horizontal rotation (rad)
  pitch: number; // user-driven vertical rotation (rad)
  frozen: boolean; // press-and-hold freezes auto-spin (slow lerp)
};

type OrbSpec = {
  radius: number;
  size: number;
  speed: number; // rad/s
  phase: number;
  basisA: readonly [number, number, number];
  basisB: readonly [number, number, number];
};

// Three orbs, different sizes + speeds, on three orthonormal-basis
// orbital planes. basisA × basisB is the orbit's normal axis, so each
// orb sweeps a circle in a tilted plane visibly distinct from the
// others.
const ORBS: OrbSpec[] = [
  // Big — the dominant moon, slow.
  {
    radius: 0.6,
    size: 0.18,
    speed: 0.6,
    phase: Math.PI,
    basisA: [1, 0, 0],
    basisB: [0, 0.95, 0.31],
  },
  // Medium — faster, on a different tilt.
  {
    radius: 0.45,
    size: 0.115,
    speed: 0.95,
    phase: Math.PI / 3,
    basisA: [0.866, 0.5, 0],
    basisB: [0, 0, 1],
  },
  // Small — fastest, near-polar plane.
  {
    radius: 0.32,
    size: 0.075,
    speed: 1.45,
    phase: (5 * Math.PI) / 4,
    basisA: [0.707, 0, 0.707],
    basisB: [0, 1, 0],
  },
];

export type HarmonyOrbsProps = {
  controlRef?: React.MutableRefObject<HarmonyControl>;
};

export default function HarmonyOrbs({ controlRef }: HarmonyOrbsProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

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
    <div ref={wrapperRef} className="harmonyOrbsRoot" aria-hidden="true">
      {active ? (
        <Canvas
          dpr={[1, 1.25]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          camera={{ position: [0, 0, 5], fov: 28 }}
        >
          <Scene controlRef={controlRef} />
        </Canvas>
      ) : null}
    </div>
  );
}

function Scene({
  controlRef,
}: {
  controlRef?: React.MutableRefObject<HarmonyControl>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const orbRefs = useRef<(THREE.Mesh | null)[]>(ORBS.map(() => null));

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Same internal-clock + speed-factor pattern as ValuesBinary so the
  // press-and-hold freeze ramps in/out smoothly instead of snapping.
  const localTime = useRef(0);
  const speedFactor = useRef(1);
  // Auto yaw drift — matches the prior CSS auto-spin (36°/s ≈ 0.628 rad/s).
  const autoYaw = useRef(Math.PI); // start at π so the moon begins behind

  useFrame((_, dt) => {
    const targetSpeed = controlRef?.current.frozen ? 0 : 1;
    const ease = 1 - Math.exp(-dt * 0.9);
    speedFactor.current += (targetSpeed - speedFactor.current) * ease;

    localTime.current += dt * speedFactor.current;
    const t = localTime.current;

    if (!reduced) {
      autoYaw.current += 0.628 * dt * speedFactor.current;
    }

    const userYaw = controlRef?.current.yaw ?? 0;
    const userPitch = controlRef?.current.pitch ?? 0;
    const TILT_Z = (28 * Math.PI) / 180;

    if (groupRef.current) {
      // Pitch (X) → fixed canted tilt (Z) → yaw (Y). The user-yaw is
      // additive to the auto-spin so releasing during a drag resumes
      // the spin from wherever the orbit was left.
      groupRef.current.rotation.set(
        userPitch,
        autoYaw.current + userYaw,
        TILT_Z,
        "XYZ",
      );
    }

    ORBS.forEach((spec, i) => {
      const ref = orbRefs.current[i];
      if (!ref) return;
      const angle = spec.phase + t * spec.speed;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      ref.position.set(
        (spec.basisA[0] * ca + spec.basisB[0] * sa) * spec.radius,
        (spec.basisA[1] * ca + spec.basisB[1] * sa) * spec.radius,
        (spec.basisA[2] * ca + spec.basisB[2] * sa) * spec.radius,
      );
    });
  });

  return (
    <>
      {/* Eclipse-moon lighting. Warm key from the sun side + a dim
          cool fill from behind so the dark spheres still read as 3D
          when they swing around to the back. */}
      <ambientLight intensity={0.28} color="#1b1b22" />
      <directionalLight
        position={[3.5, 2.5, 3]}
        intensity={1.05}
        color="#fff2d8"
      />
      <directionalLight
        position={[-2, -1, -3]}
        intensity={0.4}
        color="#5060a0"
      />

      <group ref={groupRef}>
        {ORBS.map((spec, i) => (
          <mesh
            key={i}
            ref={(node) => {
              orbRefs.current[i] = node;
            }}
          >
            <sphereGeometry args={[spec.size, 36, 36]} />
            <meshStandardMaterial
              color="#1a1a1e"
              roughness={0.85}
              metalness={0.04}
              emissive="#08080a"
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
