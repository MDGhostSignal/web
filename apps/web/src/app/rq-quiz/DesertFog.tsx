"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle desert fog background effect
 * Very lightweight - no mouse interaction, minimal layers
 * Dark, moody, monochromatic - barely visible
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

// Simple 2D noise
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

  // Three fog layers at different heights (desert horizon feel)
  // Layer 1: Ground fog - hugs bottom
  float fog1 = fbm(vec2(uv.x * 3.0 + slowTime, uv.y * 4.0));
  float height1 = smoothstep(0.35, 0.0, uv.y);
  fog1 *= height1 * 0.4;

  // Layer 2: Mid fog - rolls across landscape
  float fog2 = fbm(vec2(uv.x * 2.0 + slowTime * 0.7, uv.y * 2.5 + 0.5));
  float height2 = smoothstep(0.5, 0.15, uv.y) * smoothstep(0.0, 0.1, uv.y);
  fog2 *= height2 * 0.3;

  // Layer 3: Distant haze
  float fog3 = fbm(vec2(uv.x * 1.2 + slowTime * 0.4, uv.y * 1.5 + 1.0));
  float height3 = smoothstep(0.7, 0.25, uv.y) * smoothstep(0.1, 0.2, uv.y);
  fog3 *= height3 * 0.2;

  // Combine layers
  float fog = fog1 + fog2 + fog3;

  // Very subtle - barely visible
  fog *= 0.35;

  // Dark background - near black
  vec3 bgColor = vec3(0.035, 0.038, 0.045);

  // Subtle gradient - slightly lighter at horizon
  bgColor += vec3(0.015) * smoothstep(0.0, 0.4, uv.y) * smoothstep(0.7, 0.4, uv.y);

  // Monochromatic fog color - cool gray
  vec3 fogColor = vec3(0.12, 0.13, 0.15);

  // Mix fog with background
  vec3 color = mix(bgColor, fogColor, fog);

  // Subtle vignette for depth
  float vignette = smoothstep(1.4, 0.4, length((uv - 0.5) * 1.8));
  color *= 0.85 + 0.15 * vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function DesertFog() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      // Just show static dark background
      canvas.style.background = "#0a0b0d";
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power", // Optimize for battery
    });

    if (!gl) {
      canvas.style.background = "#0a0b0d";
      return;
    }

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, VERTEX_SHADER);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
      canvas.style.background = "#0a0b0d";
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
      canvas.style.background = "#0a0b0d";
      return;
    }

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

    // Uniforms
    const uTime = gl.getUniformLocation(program, "uTime");

    // Handle resize - use lower resolution for performance
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1); // Max 1x for performance
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Animation loop - throttled for performance
    const startTime = performance.now();
    let lastFrame = 0;
    const targetFPS = 30; // Lower FPS for subtle animation
    const frameInterval = 1000 / targetFPS;

    const render = (currentTime: number) => {
      rafRef.current = requestAnimationFrame(render);

      // Throttle to target FPS
      const elapsed = currentTime - lastFrame;
      if (elapsed < frameInterval) return;
      lastFrame = currentTime - (elapsed % frameInterval);

      const time = (currentTime - startTime) * 0.001;
      gl.uniform1f(uTime, time);
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
      className="rq-desert-fog-canvas"
      aria-hidden="true"
    />
  );
}
