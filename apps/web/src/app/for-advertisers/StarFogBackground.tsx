"use client";

import { useEffect, useRef } from "react";

import { startFullscreenShader } from "@/lib/webgl";

/**
 * Animated star field with rolling fog, sized to its parent section.
 * Black background with twinkling stars and subtle fog layers.
 */

const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

// Hash function for random values
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Smooth noise
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

// FBM for fog
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Star function with slow drift
float star(vec2 uv, vec2 pos, float brightness, float twinkleSpeed, float seed) {
  // Slow drift movement - each star moves in a unique pattern
  float driftSpeed = 0.12 + seed * 0.08;
  vec2 drift = vec2(
    sin(uTime * driftSpeed + seed * 6.28) * 0.08,
    cos(uTime * driftSpeed * 0.7 + seed * 3.14) * 0.06
  );
  vec2 movedPos = pos + drift;

  float d = length(uv - movedPos);
  float twinkle = 0.5 + 0.5 * sin(uTime * twinkleSpeed + pos.x * 100.0 + pos.y * 50.0);
  twinkle = 0.7 + 0.3 * twinkle; // Keep stars visible even at lowest twinkle
  float intensity = brightness * twinkle / (d * 80.0 + 0.01);
  return clamp(intensity, 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 scaledUv = vec2(uv.x * aspectRatio, uv.y);

  // Deep black background
  vec3 color = vec3(0.02, 0.02, 0.03);

  // Create star field - multiple layers for depth
  float stars = 0.0;

  // Layer 1: Distant small stars
  for (float i = 0.0; i < 30.0; i++) {
    vec2 starPos = vec2(
      hash21(vec2(i, 1.0)) * aspectRatio,
      hash21(vec2(i, 2.0))
    );
    float brightness = 0.3 + 0.4 * hash21(vec2(i, 3.0));
    float speed = 0.5 + 2.0 * hash21(vec2(i, 4.0));
    float seed = hash21(vec2(i, 5.0));
    stars += star(scaledUv, starPos, brightness * 0.5, speed, seed);
  }

  // Layer 2: Medium stars
  for (float i = 0.0; i < 20.0; i++) {
    vec2 starPos = vec2(
      hash21(vec2(i + 50.0, 1.0)) * aspectRatio,
      hash21(vec2(i + 50.0, 2.0))
    );
    float brightness = 0.5 + 0.5 * hash21(vec2(i + 50.0, 3.0));
    float speed = 0.3 + 1.5 * hash21(vec2(i + 50.0, 4.0));
    float seed = hash21(vec2(i + 50.0, 5.0));
    stars += star(scaledUv, starPos, brightness * 0.8, speed, seed);
  }

  // Layer 3: Bright prominent stars
  for (float i = 0.0; i < 8.0; i++) {
    vec2 starPos = vec2(
      hash21(vec2(i + 100.0, 1.0)) * aspectRatio,
      hash21(vec2(i + 100.0, 2.0))
    );
    float brightness = 0.8 + 0.2 * hash21(vec2(i + 100.0, 3.0));
    float speed = 0.2 + 1.0 * hash21(vec2(i + 100.0, 4.0));
    float seed = hash21(vec2(i + 100.0, 5.0));
    stars += star(scaledUv, starPos, brightness * 1.2, speed, seed);
  }

  // Add stars to color with slight blue/white tint. Overall
  // dimming factor pulls back the glowing-orb layer so it reads as
  // ambient starfield rather than a spotlight.
  color += stars * vec3(0.9, 0.95, 1.0) * 0.35;

  // Fog layers
  float slowTime = uTime * 0.015;

  // Layer 1: Low rolling fog
  vec2 fogUv1 = vec2(uv.x * aspectRatio + slowTime, uv.y);
  float fog1 = fbm(fogUv1 * 2.0);
  float fogMask1 = smoothstep(0.5, 0.0, uv.y);
  fog1 *= fogMask1 * 0.25;

  // Layer 2: Mid-height fog wisps
  vec2 fogUv2 = vec2(uv.x * aspectRatio + slowTime * 0.7 + 5.0, uv.y + 2.0);
  float fog2 = fbm(fogUv2 * 1.5);
  float fogMask2 = smoothstep(0.6, 0.2, uv.y) * smoothstep(0.0, 0.15, uv.y);
  fog2 *= fogMask2 * 0.2;

  // Layer 3: Subtle overall haze
  vec2 fogUv3 = vec2(uv.x * aspectRatio + slowTime * 0.4 + 10.0, uv.y + 4.0);
  float fog3 = fbm(fogUv3 * 0.8);
  fog3 *= 0.1;

  float totalFog = fog1 + fog2 + fog3;

  // Fog color - cool gray with slight blue
  vec3 fogColor = vec3(0.15, 0.17, 0.22);

  // Mix fog into scene
  color = mix(color, fogColor, totalFog);

  // Subtle vignette
  float vignette = smoothstep(1.5, 0.5, length((uv - 0.5) * 1.8));
  color *= 0.8 + 0.2 * vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;

interface StarFogBackgroundProps {
  className?: string;
}

export default function StarFogBackground({ className = "" }: StarFogBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let uTime: WebGLUniformLocation | null = null;
    let uResolution: WebGLUniformLocation | null = null;

    return startFullscreenShader(canvas, FRAGMENT_SHADER, {
      contextAttributes: {
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      },
      targetFps: 30,
      dprCap: 1.5,
      sizeMode: "parent",
      onFallback: (c) => {
        c.style.background = "#0a0b0d";
      },
      onInit: ({ gl, program }) => {
        uTime = gl.getUniformLocation(program, "uTime");
        uResolution = gl.getUniformLocation(program, "uResolution");
      },
      onFrame: ({ gl, time, width, height }) => {
        gl.uniform1f(uTime, time);
        gl.uniform2f(uResolution, width, height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
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
