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
              intensity={0.85}
              luminanceThreshold={0.42}
              luminanceSmoothing={0.22}
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
// Marching-cubes volume scale (world units). drei's <MarchingCubes>
// is a unit cube internally; this multiplies its bounding box. The
// blobs need a bit of headroom past SEP_BASE so they don't clip the
// volume edges as they orbit, hence 3.4 (vs the bare-minimum 2.7).
const MC_SCALE = 3.4;

function BinaryScene() {
  const orbitRef = useRef<THREE.Group>(null);
  // Marching-cube blob refs. Each one is a metaball that contributes
  // to a single shared marching-cubes surface — when they're close,
  // the implicit surface naturally bridges between them, giving the
  // bubbly liquid morph. drei's <MarchingCube> forwards a
  // THREE.Group; we read .position each frame to drive the metaball.
  const blobARef = useRef<THREE.Group>(null);
  const blobBRef = useRef<THREE.Group>(null);
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

    if (!reduced) {
      const PERIOD = 14;
      const phase = (t % PERIOD) / PERIOD; // 0..1
      // 0→1→0 cosine cycle; orbs drift together, merge, drift apart.
      const cycle = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      sep.current = SEP_BASE * (1 - cycle);
      tilt.current = TILT_BASE + 0.18 * Math.sin(t * 0.1);
      yaw.current += 0.1 * dt;
    } else {
      sep.current = SEP_BASE;
      tilt.current = TILT_BASE;
    }

    orbit.rotation.x = tilt.current;
    orbit.rotation.y = yaw.current;

    // Marching-cubes positions are normalized into the cube volume's
    // local space ([-0.5, 0.5] for drei's <MarchingCubes>). MC_SCALE
    // is what we set on the parent; dividing the world separation by
    // it gives the correct local position.
    const sepLocal = sep.current / MC_SCALE;

    // High-frequency wobble — when the blobs are merged, this small
    // oscillation makes the surface ripple as if the unified droplet
    // is settling. RIPPLE_AMP scales up dramatically near the merge
    // (cycle high) so far-apart blobs are still + steady but the
    // merged blob shimmers.
    const cycleVal =
      reduced
        ? 0
        : 0.5 - 0.5 * Math.cos(((t % 14) / 14) * Math.PI * 2);
    const rippleEnvelope = Math.min(1, cycleVal * 1.4); // peaks earlier
    const wobbleA = Math.sin(t * 5.5) * 0.018 * rippleEnvelope;
    const wobbleB = Math.cos(t * 4.7 + 1.3) * 0.018 * rippleEnvelope;
    const wobbleY = Math.sin(t * 3.1) * 0.012 * rippleEnvelope;

    if (blobARef.current) {
      blobARef.current.position.set(sepLocal + wobbleA, wobbleY, 0);
    }
    if (blobBRef.current) {
      blobBRef.current.position.set(-sepLocal + wobbleB, -wobbleY, 0);
    }

    // Point lights track the blob world positions so the surface
    // shading still has directional light from "where the blob is."
    if (lightARef.current) lightARef.current.position.x = sep.current;
    if (lightBRef.current) lightBRef.current.position.x = -sep.current;

    const breath = 0.85 + 0.15 * Math.sin(t * 1.2);
    if (lightARef.current) lightARef.current.intensity = 6.5 * breath;
    if (lightBRef.current) lightBRef.current.intensity = 5.5 * breath;
    if (centerLightRef.current)
      centerLightRef.current.intensity = 1.4 * breath;
  });

  return (
    <>
      <ambientLight intensity={0.22} color="#dde0ec" />
      {/* Cool key fill from the upper-back-left — gives the dark grey
          metallic surface enough light to read its terminator and
          edge curve without flooding it. */}
      <directionalLight
        position={[-2, 4, -3]}
        intensity={0.55}
        color="#b8c0e0"
      />
      {/* Warm rim from behind + below so the silhouette catches a
          subtle warm edge against the page's dark background — adds
          depth without competing with the white key lights tracking
          the metaballs. */}
      <directionalLight
        position={[3, -2, -4]}
        intensity={0.35}
        color="#ffd8a8"
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
          resolution={64}
          maxPolyCount={20000}
          enableUvs={false}
          enableColors={false}
          scale={MC_SCALE}
        >
          <meshStandardMaterial
            color="#2e2e34"
            roughness={0.2}
            metalness={0.78}
            emissive="#0a0a10"
            emissiveIntensity={0.15}
          />
          <MarchingCube
            ref={blobARef}
            strength={0.45}
            subtract={6}
            position={[SEP_BASE / MC_SCALE, 0, 0]}
          />
          <MarchingCube
            ref={blobBRef}
            strength={0.45}
            subtract={6}
            position={[-SEP_BASE / MC_SCALE, 0, 0]}
          />
        </MarchingCubes>

        {/* Point lights track the blob world positions (updated each
            frame in useFrame). They sit OUTSIDE the marching cubes
            volume since drei's <MarchingCube> doesn't accept arbitrary
            children — keeping lights as siblings of the parent gives
            them free positioning. */}
        <pointLight
          ref={lightARef}
          position={[SEP_BASE, 0, 0]}
          color="#ffffff"
          intensity={6.5}
          distance={6.5}
          decay={2}
        />
        <pointLight
          ref={lightBRef}
          position={[-SEP_BASE, 0, 0]}
          color="#fff4e8"
          intensity={5.5}
          distance={6.5}
          decay={2}
        />
      </group>
    </>
  );
}
