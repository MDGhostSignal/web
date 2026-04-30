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
// Radii are tuned so each orbit clearly clears the sun's silhouette
// (sun radius is ~0.42 world units once the wrapper inset is -100%).
// Smallest orbit is still ~1.3× sun radius so all three read as
// genuinely circling the sun, not parking on top of it.
const ORBS: OrbSpec[] = [
  // Big — the dominant moon, slow.
  {
    radius: 0.95,
    size: 0.18,
    speed: 0.6,
    phase: Math.PI,
    basisA: [1, 0, 0],
    basisB: [0, 0.95, 0.31],
  },
  // Medium — faster, on a different tilt.
  {
    radius: 0.75,
    size: 0.115,
    speed: 0.95,
    phase: Math.PI / 3,
    basisA: [0.866, 0.5, 0],
    basisB: [0, 0, 1],
  },
  // Small — fastest, near-polar plane.
  {
    radius: 0.55,
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
  const sunRef = useRef<THREE.Mesh>(null);
  const sunHaloRef = useRef<THREE.Mesh>(null);
  const sunHaloOuterRef = useRef<THREE.Mesh>(null);
  const sunLightRef = useRef<THREE.PointLight>(null);

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

    // Subtle 10-second breathing pulse on the sun + halos + emitted
    // light, matching the pace of the CSS corona keyframes underneath.
    const phase = Math.sin(t * ((Math.PI * 2) / 10));
    const breath = 1 + phase * 0.03;
    if (sunRef.current) sunRef.current.scale.setScalar(breath);
    if (sunHaloRef.current) sunHaloRef.current.scale.setScalar(breath * 1.05);
    if (sunHaloOuterRef.current)
      sunHaloOuterRef.current.scale.setScalar(breath * 1.1);
    // The light's own intensity breathes in lockstep so the orbs
    // visibly brighten and dim as the sun pulses.
    if (sunLightRef.current) sunLightRef.current.intensity = 2.4 + phase * 0.25;
  });

  return (
    <>
      {/* Lighting. The sun is the only meaningful light source — a
          point light at the origin means the side of each orb facing
          the sun is bright and the far side falls into darkness, so
          the orbs read as bodies orbiting a real luminous core. A
          very dim ambient prevents the back hemisphere from going
          fully black on the dark side of the scene. */}
      <ambientLight intensity={0.08} color="#1f2030" />
      <pointLight
        ref={sunLightRef}
        position={[0, 0, 0]}
        intensity={2.4}
        decay={2}
        distance={0}
        color="#ffffff"
      />

      {/* The sun. Self-illuminating (meshBasicMaterial ignores lights),
          so orbs orbiting it cast no shadow on it and it reads as a
          luminous body. Sits at world origin so the orbital math
          (which already centres on the origin) still works unchanged
          — and crucially shares a depth context with the orbs, so
          when an orb's z is negative and its screen-projection
          overlaps the sun, the sun occludes it. Pure white per
          design direction. toneMapped:false keeps it at full
          brightness even if the renderer applies tonemapping. */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.22, 64, 64]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* Two stacked additive halo shells — together they fake the
          photospheric rim glow. The inner shell hugs the disk for a
          tight white edge; the outer is wider and dimmer for the
          atmospheric bloom. Both are additive on the dark backdrop
          so they read as light, not as semi-transparent geometry. */}
      <mesh ref={sunHaloRef}>
        <sphereGeometry args={[0.28, 48, 48]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={sunHaloOuterRef}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

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
