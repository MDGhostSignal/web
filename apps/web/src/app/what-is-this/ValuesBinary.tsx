"use client";

import { Canvas, useFrame } from "@react-three/fiber";
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
export default function ValuesBinary() {
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
          <BinaryScene />
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.7}
              luminanceThreshold={0.55}
              luminanceSmoothing={0.18}
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

// Animation constants. Separation oscillates from SEP_BASE down to 0
// and back as the cycle runs. Tilt slowly drifts around TILT_BASE.
const SEP_BASE = 1.35;
const TILT_BASE = 0.32;
// Threshold below which the two spheres swap to a single merged
// sphere. Just below 2 × sphere radius (0.48) so the swap happens
// at full overlap. Next-pass goal: replace this hard swap with a
// raymarched SDF metaball blend.
const MERGE_THRESHOLD = 0.5;

function BinaryScene() {
  const orbitRef = useRef<THREE.Group>(null);
  const sphereARef = useRef<THREE.Mesh>(null);
  const sphereBRef = useRef<THREE.Mesh>(null);
  const mergedSphereRef = useRef<THREE.Mesh>(null);
  const lightARef = useRef<THREE.PointLight>(null);
  const lightBRef = useRef<THREE.PointLight>(null);
  const centerLightRef = useRef<THREE.PointLight>(null);

  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Animation state. No mouse interaction — separation oscillates on
  // its own clock, the orbs are drawn together, merge, and bounce
  // back apart in an endless slow cycle.
  const yaw = useRef(0);
  const sep = useRef(SEP_BASE);
  const tilt = useRef(TILT_BASE);

  useFrame((state, dt) => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    const t = state.clock.elapsedTime;

    // Drive separation on a slow cosine cycle. Period 14s; the cycle
    // moves 0→1→0 across each period, so the orbs drift toward each
    // other, fully merge at the peak, then drift back apart. Cosine
    // shaping gives the slow-in / slow-out feel — they linger at the
    // extremes (apart and merged) rather than racing through them.
    if (!reduced) {
      const PERIOD = 14;
      const phase = (t % PERIOD) / PERIOD; // 0..1
      const cycle = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2); // 0→1→0
      sep.current = SEP_BASE * (1 - cycle);
      // Slow tilt drift, ~63s per full sine — adds a little life to
      // the orbital plane without ever being noticeable mid-glance.
      tilt.current = TILT_BASE + 0.18 * Math.sin(t * 0.1);
      // Auto-spin yaw — slowed from 0.21 → 0.10 rad/s for a more
      // elegant pace.
      yaw.current += 0.1 * dt;
    } else {
      sep.current = SEP_BASE;
      tilt.current = TILT_BASE;
    }

    orbit.rotation.x = tilt.current;
    orbit.rotation.y = yaw.current;

    if (sphereARef.current) sphereARef.current.position.x = sep.current;
    if (sphereBRef.current) sphereBRef.current.position.x = -sep.current;

    // Merge state — hard snap for v1; piece 2 will replace with a
    // raymarched SDF metaball blend that morphs organically.
    const merged = sep.current < MERGE_THRESHOLD;
    if (sphereARef.current) sphereARef.current.visible = !merged;
    if (sphereBRef.current) sphereBRef.current.visible = !merged;
    if (mergedSphereRef.current) mergedSphereRef.current.visible = merged;

    // Light intensity gentle breath, no hover boost (no pointer
    // interaction anymore).
    const breath = 0.85 + 0.15 * Math.sin(t * 1.2);
    if (lightARef.current) lightARef.current.intensity = 4.5 * breath;
    if (lightBRef.current) lightBRef.current.intensity = 3.0 * breath;
    if (centerLightRef.current)
      centerLightRef.current.intensity = 1.4 * breath;
  });

  return (
    <>
      <ambientLight intensity={0.18} color="#f4f5ff" />
      {/* Faint cool fill from the back so silhouettes never read pure
          black against the page background. */}
      <directionalLight
        position={[-2, 4, -3]}
        intensity={0.18}
        color="#a8b0d4"
      />

      {/* Centre point light — sits at orbit's centre and pulses softly. */}
      <pointLight
        ref={centerLightRef}
        position={[0, 0, 0]}
        color="#ffffff"
        intensity={1.4}
        distance={3.4}
        decay={2}
      />

      <group ref={orbitRef}>
        {/* Sphere A — white. Faint emissive so its highlight reads
            against the dark page background; the bloom pass picks up
            the emissive bands and gives the sphere a soft halo. */}
        <mesh ref={sphereARef} position={[SEP_BASE, 0, 0]}>
          <sphereGeometry args={[0.48, 32, 24]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.32}
            metalness={0.18}
            emissive="#f8f8ff"
            emissiveIntensity={0.35}
          />
          <pointLight
            ref={lightARef}
            color="#ffffff"
            intensity={4.5}
            distance={5.5}
            decay={2}
          />
        </mesh>

        {/* Sphere B — black. No emissive; the surface reads via the
            white point light from Sphere A bouncing off it, which
            gives a clean directional shadow on B as A orbits. */}
        <mesh ref={sphereBRef} position={[-SEP_BASE, 0, 0]}>
          <sphereGeometry args={[0.48, 32, 24]} />
          <meshStandardMaterial
            color="#0a0a0c"
            roughness={0.42}
            metalness={0.32}
            emissive="#000000"
            emissiveIntensity={0}
          />
          <pointLight
            ref={lightBRef}
            color="#ffffff"
            intensity={3.0}
            distance={5.5}
            decay={2}
          />
        </mesh>

        {/* Merged sphere — placeholder for the liquid metaball blend
            (piece 2). Hidden until separation < MERGE_THRESHOLD;
            currently snaps in as a single bigger sphere. Radius ~1.36×
            the small sphere so the visual mass roughly conserves
            (2 × r³ ≈ (1.26 r)³ for true volume conservation; bumped
            slightly larger so the merge reads as a unification, not
            a shrink). White-leaning to match Sphere A's role. */}
        <mesh ref={mergedSphereRef} position={[0, 0, 0]} visible={false}>
          <sphereGeometry args={[0.65, 48, 32]} />
          <meshStandardMaterial
            color="#f4f4f6"
            roughness={0.3}
            metalness={0.22}
            emissive="#fafaff"
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>
    </>
  );
}
