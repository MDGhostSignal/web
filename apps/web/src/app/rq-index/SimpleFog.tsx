"use client";

import { useEffect, useRef } from "react";

/**
 * Simple, performant fog effect using 2D noise
 * Much lighter than raymarching - suitable for background use
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
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;

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

// Simple FBM with just 3 octaves for performance
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

void main() {
  vec2 uv = vUv;

  // Slow right-to-left drift
  float driftTime = uTime * 0.01;

  // Two layers of fog at different scales
  float fog1 = fbm(vec2(uv.x * 2.0 + driftTime, uv.y * 2.0));
  float fog2 = fbm(vec2(uv.x * 1.0 + driftTime * 0.7, uv.y * 1.2));

  // Combine layers
  float fog = fog1 * 0.6 + fog2 * 0.4;

  // Height-based gradient (more fog at bottom)
  float heightFalloff = smoothstep(0.5, 0.0, uv.y);
  fog *= heightFalloff;

  // Mouse interaction - simple displacement
  vec2 toMouse = uv - uMouse;
  float mouseDist = length(toMouse);
  float mouseSpeed = length(uMouseVelocity);

  // Small area of effect
  float mouseInfluence = smoothstep(0.15, 0.0, mouseDist);

  // Displace fog sampling based on mouse movement
  if (mouseInfluence > 0.0) {
    vec2 displacement = normalize(uMouseVelocity) * mouseInfluence * mouseSpeed * 0.5;
    vec2 displacedUv = uv + displacement;

    // Resample fog at displaced position
    float fog1Displaced = fbm(vec2(displacedUv.x * 2.0 + driftTime, displacedUv.y * 2.0));
    float fog2Displaced = fbm(vec2(displacedUv.x * 1.0 + driftTime * 0.7, displacedUv.y * 1.2));
    float fogDisplaced = fog1Displaced * 0.6 + fog2Displaced * 0.4;
    fogDisplaced *= smoothstep(0.5, 0.0, displacedUv.y);

    fog = mix(fog, fogDisplaced, mouseInfluence);

    // Clear fog at mouse position
    fog *= 1.0 - mouseInfluence * 0.7;
  }

  // Adjust fog density
  fog = pow(fog, 0.8) * 1.2;
  fog = clamp(fog, 0.0, 1.0);

  // Dark background with gradient
  vec3 bgColor = mix(
    vec3(0.01, 0.015, 0.025),
    vec3(0.04, 0.05, 0.08),
    uv.y
  );

  // Simple stars
  float star = 0.0;
  if (uv.y > 0.5) {
    float starNoise = hash(floor(uv * 300.0 + uTime * 0.01));
    if (starNoise > 0.998) {
      star = (starNoise - 0.998) * 400.0;
    }
  }
  bgColor += vec3(star) * 0.3;

  // Fog color
  vec3 fogColor = vec3(0.25, 0.27, 0.3);

  // Mouse light
  float mouseLight = exp(-mouseDist * 3.0) * mouseSpeed * 3.0;
  fogColor += vec3(0.3, 0.35, 0.4) * mouseLight * fog;

  // Mix fog with background
  vec3 color = mix(bgColor, fogColor, fog);

  // Subtle vignette
  float vignette = smoothstep(1.2, 0.5, length((uv - 0.5) * 1.5));
  color *= 0.7 + 0.3 * vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function SimpleFog() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, prevX: 0.5, prevY: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
    });

    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, VERTEX_SHADER);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
      return;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
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
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uMouseVelocity = gl.getUniformLocation(program, "uMouseVelocity");

    // Handle resize
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5); // Lower DPR for performance
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;

      const mouse = mouseRef.current;
      mouse.vx = (x - mouse.prevX) * 2.0;
      mouse.vy = (y - mouse.prevY) * 2.0;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x += (x - mouse.x) * 0.15;
      mouse.y += (y - mouse.y) * 0.15;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    const startTime = performance.now();
    const render = () => {
      const currentTime = (performance.now() - startTime) * 0.001;

      gl.uniform1f(uTime, currentTime);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform2f(uMouseVelocity, mouseRef.current.vx, mouseRef.current.vy);

      // Decay velocity
      mouseRef.current.vx *= 0.9;
      mouseRef.current.vy *= 0.9;

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
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
      className="fixed inset-0 w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}
