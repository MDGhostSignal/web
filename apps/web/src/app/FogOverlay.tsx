"use client";

import { useEffect, useRef } from "react";

import { startFullscreenShader } from "@/lib/webgl";

/**
 * Ethereal fog overlay effect — an animated, translucent WebGL layer
 * rendered on top of the homepage hero video for a wispy fog look.
 */

const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;

// Smooth noise function
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

// Fractal Brownian Motion for organic fog shapes
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// Wispy tendrils effect
float wisp(vec2 uv, float time, float seed) {
  vec2 p = uv;
  p.x += time * 0.02 + seed;
  p.y += sin(time * 0.1 + seed * 10.0) * 0.05;

  float n = fbm(p * 3.0 + seed);
  n = pow(n, 1.5);

  return n;
}

void main() {
  vec2 uv = vUv;
  float aspectRatio = uResolution.x / uResolution.y;

  // Slow time for gentle movement
  float slowTime = uTime * 0.15;

  // Multiple fog layers moving at different speeds
  float fog = 0.0;

  // Layer 1: Large, slow-moving wisps
  vec2 uv1 = uv;
  uv1.x *= aspectRatio;
  uv1.x += slowTime * 0.3;
  uv1.y += sin(slowTime * 0.2) * 0.1;
  float layer1 = fbm(uv1 * 1.5);
  layer1 = smoothstep(0.3, 0.7, layer1);
  fog += layer1 * 0.4;

  // Layer 2: Medium wisps
  vec2 uv2 = uv;
  uv2.x *= aspectRatio;
  uv2.x += slowTime * 0.5 + 10.0;
  uv2.y += cos(slowTime * 0.15) * 0.08;
  float layer2 = fbm(uv2 * 2.5 + 5.0);
  layer2 = smoothstep(0.35, 0.65, layer2);
  fog += layer2 * 0.3;

  // Layer 3: Fine, faster details
  vec2 uv3 = uv;
  uv3.x *= aspectRatio;
  uv3.x += slowTime * 0.8 + 20.0;
  uv3.y += sin(slowTime * 0.25 + 2.0) * 0.06;
  float layer3 = fbm(uv3 * 4.0 + 15.0);
  layer3 = smoothstep(0.4, 0.6, layer3);
  fog += layer3 * 0.2;

  // Layer 4: Subtle background haze
  vec2 uv4 = uv;
  uv4.x *= aspectRatio;
  uv4.x += slowTime * 0.15;
  float layer4 = fbm(uv4 * 0.8 + 25.0);
  fog += layer4 * 0.15;

  // Vertical distribution - more fog in middle, less at edges
  float verticalFade = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  fog *= verticalFade;

  // Horizontal variation
  float horizontalVariation = 0.7 + 0.3 * sin(uv.x * 3.14159 + slowTime * 0.1);
  fog *= horizontalVariation;

  // Clamp and adjust intensity
  fog = clamp(fog, 0.0, 1.0);
  fog *= 0.35; // Overall opacity - subtle overlay

  // Fog color - soft white/gray with slight blue tint
  vec3 fogColor = vec3(0.85, 0.88, 0.92);

  // Output with transparency
  gl_FragColor = vec4(fogColor, fog);
}
`;

interface FogOverlayProps {
  className?: string;
}

export default function FogOverlay({ className = "" }: FogOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let uTime: WebGLUniformLocation | null = null;
    let uResolution: WebGLUniformLocation | null = null;

    return startFullscreenShader(canvas, FRAGMENT_SHADER, {
      contextAttributes: {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        powerPreference: "low-power",
      },
      targetFps: 30,
      dprCap: 1.5,
      onInit: ({ gl, program }) => {
        // Alpha blending so the hero video shows through.
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        uTime = gl.getUniformLocation(program, "uTime");
        uResolution = gl.getUniformLocation(program, "uResolution");
      },
      onFrame: ({ gl, time, width, height }) => {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
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
