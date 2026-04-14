"use client";

import { useEffect, useRef } from "react";

/**
 * Animated star field with rolling fog background
 * Black background with twinkling stars and subtle fog layers
 */

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
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

  // Add stars to color with slight blue/white tint
  color += stars * vec3(0.9, 0.95, 1.0);

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
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      canvas.style.background = "#0a0b0d";
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });

    if (!gl) {
      canvas.style.background = "#0a0b0d";
      return;
    }

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, VERTEX_SHADER);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
      canvas.style.background = "#0a0b0d";
      return;
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
      canvas.style.background = "#0a0b0d";
      return;
    }

    // Link program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      canvas.style.background = "#0a0b0d";
      return;
    }

    gl.useProgram(program);

    // Create fullscreen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const uTime = gl.getUniformLocation(program, "uTime");
    const uResolution = gl.getUniformLocation(program, "uResolution");

    // Handle resize
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Animation loop
    const startTime = performance.now();
    let lastFrame = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const render = (currentTime: number) => {
      rafRef.current = requestAnimationFrame(render);

      // Throttle to target FPS
      const elapsed = currentTime - lastFrame;
      if (elapsed < frameInterval) return;
      lastFrame = currentTime - (elapsed % frameInterval);

      const time = (currentTime - startTime) * 0.001;

      gl.uniform1f(uTime, time);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    rafRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
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
