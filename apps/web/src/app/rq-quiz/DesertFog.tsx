"use client";

import { useEffect, useRef } from "react";

import { startFullscreenShader } from "@/lib/webgl";

/**
 * Subtle desert fog background effect.
 *
 * Very lightweight — no mouse interaction, only two FBM octaves, 30 FPS,
 * `powerPreference: "low-power"`. Designed to sit behind text without
 * being visually heavy.
 */

const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

varying vec2 vUv;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Simple FBM with just 2 octaves for max performance
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 2; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv;

  // Very slow horizontal drift
  float slowTime = uTime * 0.008;

  // Layer 1: Ground fog — hugs bottom
  float fog1 = fbm(vec2(uv.x * 3.0 + slowTime, uv.y * 4.0));
  float height1 = smoothstep(0.35, 0.0, uv.y);
  fog1 *= height1 * 0.4;

  // Layer 2: Mid fog — rolls across landscape
  float fog2 = fbm(vec2(uv.x * 2.0 + slowTime * 0.7, uv.y * 2.5 + 0.5));
  float height2 = smoothstep(0.5, 0.15, uv.y) * smoothstep(0.0, 0.1, uv.y);
  fog2 *= height2 * 0.3;

  // Layer 3: Distant haze
  float fog3 = fbm(vec2(uv.x * 1.2 + slowTime * 0.4, uv.y * 1.5 + 1.0));
  float height3 = smoothstep(0.7, 0.25, uv.y) * smoothstep(0.1, 0.2, uv.y);
  fog3 *= height3 * 0.2;

  float fog = fog1 + fog2 + fog3;
  fog *= 0.35;

  // Dark background — near black
  vec3 bgColor = vec3(0.035, 0.038, 0.045);
  // Slight horizon warmth
  bgColor += vec3(0.015) * smoothstep(0.0, 0.4, uv.y) * smoothstep(0.7, 0.4, uv.y);

  // Monochromatic fog color — cool gray
  vec3 fogColor = vec3(0.12, 0.13, 0.15);
  vec3 color = mix(bgColor, fogColor, fog);

  // Subtle vignette for depth
  float vignette = smoothstep(1.4, 0.4, length((uv - 0.5) * 1.8));
  color *= 0.85 + 0.15 * vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function DesertFog() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return startFullscreenShader(canvas, FRAGMENT_SHADER, {
      contextAttributes: {
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      },
      targetFps: 30,
      dprCap: 1,
      onFallback: (c) => {
        c.style.background = "#0a0b0d";
      },
      onFrame: ({ gl, program, time }) => {
        const uTime = gl.getUniformLocation(program, "uTime");
        gl.uniform1f(uTime, time);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="rq-desert-fog-canvas"
      aria-hidden="true"
    />
  );
}
