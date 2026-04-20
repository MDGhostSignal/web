"use client";

import { useEffect, useRef } from "react";

import { startFullscreenShader } from "@/lib/webgl";

/**
 * Refined, dense volumetric fog with 3D parallax layers that respond to
 * cursor position. Sized to its parent section, so only the hero pays
 * the WebGL cost. On coarse-pointer (touch) devices the mouse listener
 * is skipped and DPR is capped harder so mobile stays cheap.
 */

const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
// 1.0 when the cursor is emitting fog (desktop pointers), 0.0 otherwise.
uniform float uEmission;
// 1.0 while the cursor is over the hero — beams track toward it.
// 0.0 otherwise — beams resume a free 360° orbit.
uniform float uMouseActive;

// Scene: rotating volumetric searchlight rising from a source hidden
// below the frame, swept through deep ambient fog and combined with the
// cursor particle emitter. No FBM noise anywhere (particles + drifting
// Gaussian cloud blobs do all the fog work) so the image stays free of
// grid artifacts.

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  // Deep indigo backdrop with a soft vertical gradient. Painterly, no noise.
  vec3 color = mix(
    vec3(0.010, 0.013, 0.026),
    vec3(0.030, 0.036, 0.062),
    smoothstep(0.0, 1.0, uv.y)
  );

  // --- Ambient drifting fog banks ------------------------------------
  // Six big soft Gaussians wandering independently. Reads as "deep fog"
  // without any grid noise to alias against.
  float ambient = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float sx = fract(sin(fi * 12.9898) * 43758.5);
    float sy = fract(sin(fi * 78.2330) * 43758.5);
    vec2 origin = vec2(
      fract(sx + uTime * (0.010 + sx * 0.012)),
      mix(0.08, 0.55, sy) + sin(uTime * (0.004 + sy * 0.006) + fi) * 0.05
    );
    vec2 d = uv - origin;
    d.x *= aspect * 0.45;         // elongate horizontally — cloud bank
    ambient += exp(-dot(d, d) * 5.5) * (0.16 + sy * 0.12);
  }
  ambient = clamp(ambient, 0.0, 0.55);

  // --- Spinning searchlight beams ------------------------------------
  // Source is tucked below the visible frame so only the sweeping rays
  // show. Beams emerge from below and fan upward through the fog.
  vec2 lightOrigin = vec2(0.5, -0.06);
  vec2 toLight = vec2((uv.x - 0.5) * aspect, uv.y - lightOrigin.y);
  float pxAngle = atan(toLight.y, toLight.x);
  float pxDist  = length(toLight);

  float orbitAngle = uTime * 0.55;
  // When active, the primary beam points from the source toward the
  // cursor. When inactive, it keeps rotating freely.
  vec2 srcToMouse = vec2(
    (uMouse.x - 0.5) * aspect,
    uMouse.y - lightOrigin.y
  );
  float mouseAngle = atan(srcToMouse.y, srcToMouse.x);
  float beamAngle = uMouseActive > 0.5 ? mouseAngle : orbitAngle;

  // Two opposing beams, 180° apart.
  float a1 = mod(pxAngle - beamAngle + 3.14159, 6.28318) - 3.14159;
  float a2 = mod(pxAngle - beamAngle,            6.28318) - 3.14159;

  float coneHalf = 0.18;
  float beam1 = smoothstep(coneHalf, coneHalf * 0.15, abs(a1));
  float beam2 = smoothstep(coneHalf, coneHalf * 0.15, abs(a2));
  float beam  = max(beam1, beam2);

  // Volumetric attenuation: beam dims with distance from the source.
  float beamVol = beam * exp(-pxDist * 1.9);

  // Clean white searchlight — no yellow tint.
  vec3 beamColor = vec3(1.0, 1.0, 1.0);

  // Beam lights the ambient fog volumetrically — a soft painterly wash
  // rather than a hard wedge.
  color += beamColor * beamVol * (0.35 + ambient * 0.90);

  // Distance haze: ambient fog washes everything, adding depth.
  color = mix(color, vec3(0.13, 0.15, 0.21), ambient * 0.45);

  // --- Particle field ------------------------------------------------
  // Small droplets born tight to the cursor, falling straight-ish under
  // gravity with a very subtle lateral drift. Reads as liquid dripping
  // rather than a wobbling fog ball.
  float mass = 0.0;
  if (uEmission > 0.5) {
    const int COUNT = 22;
    float life = 6.0;

    for (int j = 0; j < COUNT; j++) {
      float i = float(j);
      float age = mod(uTime + i * (life / float(COUNT)), life);
      float t = age / life;

      // Tight birth jitter — droplets emerge from (almost) the cursor point.
      float birthAngle = i * 2.3987;
      vec2 birth = vec2(cos(birthAngle), sin(birthAngle)) * 0.006;

      // Gravity — slower fall than the old fog ball.
      float fall = age * age * 0.018 + age * 0.010;

      // Very subtle lateral motion so drops aren't perfectly straight
      // but stay vertically dominant.
      float wiggle = sin(age * 0.7 + i * 1.7) * 0.011
                   + cos(age * 0.3 + i * 0.9) * 0.005;
      float sway   = sin(age * 0.2 + i) * 0.003;

      vec2 pos = uMouse + birth + vec2(wiggle + sway, -fall);

      vec2 d = uv - pos;
      d.x *= aspect;

      // Much smaller droplets. Grows gently with age as they spread.
      float radius = 0.016 + t * 0.055;

      float env = smoothstep(0.0, 0.15, t) * (1.0 - t) * (1.0 - t);

      mass += exp(-dot(d, d) / (radius * radius)) * env;
    }
    mass *= 0.75;
  }
  mass = clamp(mass, 0.0, 1.0);

  // Fog color, lit by the beam where they overlap so the sweeping
  // searchlight visibly illuminates the cursor-emitted fog.
  vec3 fogCol = mix(
    vec3(0.30, 0.34, 0.42),
    vec3(0.58, 0.60, 0.66),
    mass
  );
  fogCol += beamColor * beamVol * 0.8;

  color = mix(color, fogCol, mass);

  // Gentle vignette — keeps attention on the headline band.
  vec2 c = uv - 0.5;
  c.x *= aspect;
  float vignette = smoothstep(0.95, 0.30, length(c));
  color *= 0.70 + 0.30 * vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function HeroFog() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    // Tracks whether the cursor is currently over the hero. Drives
    // whether the searchlight follows the cursor or free-orbits.
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isCoarsePointer =
      window.matchMedia("(pointer: coarse)").matches;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      mouseRef.current.active = inside;
      if (inside) {
        mouseRef.current.targetX = x;
        mouseRef.current.targetY = y;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    if (!isCoarsePointer) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("blur", handleMouseLeave);
    }

    let uTime: WebGLUniformLocation | null = null;
    let uResolution: WebGLUniformLocation | null = null;
    let uMouse: WebGLUniformLocation | null = null;
    let uMouseActive: WebGLUniformLocation | null = null;

    const stop = startFullscreenShader(canvas, FRAGMENT_SHADER, {
      contextAttributes: {
        alpha: false,
        antialias: false,
        powerPreference: isCoarsePointer ? "low-power" : "high-performance",
      },
      sizeMode: "parent",
      // Fragment cost scales with pixel count — cap harder on mobile.
      dprCap: isCoarsePointer ? 1 : 1.5,
      // Keep the animation loop breathing on low-power devices.
      targetFps: isCoarsePointer ? 30 : undefined,
      onFallback: (c) => {
        c.style.background =
          "linear-gradient(to bottom, #060812, #0d1124)";
      },
      onInit: ({ gl, program }) => {
        uTime = gl.getUniformLocation(program, "uTime");
        uResolution = gl.getUniformLocation(program, "uResolution");
        uMouse = gl.getUniformLocation(program, "uMouse");
        uMouseActive = gl.getUniformLocation(program, "uMouseActive");
        // Fog emitter is temporarily disabled — flip this back to
        // `isCoarsePointer ? 0.0 : 1.0` to re-enable.
        const uEmission = gl.getUniformLocation(program, "uEmission");
        gl.uniform1f(uEmission, 0.0);
      },
      onFrame: ({ gl, time, width, height }) => {
        // Lazy easing — beam catches up to the cursor instead of snapping.
        const m = mouseRef.current;
        m.x += (m.targetX - m.x) * 0.045;
        m.y += (m.targetY - m.y) * 0.045;

        gl.uniform1f(uTime, time);
        gl.uniform2f(uResolution, width, height);
        gl.uniform2f(uMouse, m.x, m.y);
        gl.uniform1f(uMouseActive, m.active ? 1.0 : 0.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    });

    return () => {
      if (!isCoarsePointer) {
        window.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseleave", handleMouseLeave);
        window.removeEventListener("blur", handleMouseLeave);
      }
      stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
