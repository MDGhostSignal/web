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

  // Five layers of fog at different scales and speeds for depth
  // Layer 1: Closest, fastest, most detailed
  float fog1 = fbm(vec2(uv.x * 2.5 + driftTime * 1.2, uv.y * 2.5));
  float heightFalloff1 = smoothstep(0.4, 0.0, uv.y);
  fog1 *= heightFalloff1;

  // Layer 2: Mid-close
  float fog2 = fbm(vec2(uv.x * 1.8 + driftTime, uv.y * 1.8));
  float heightFalloff2 = smoothstep(0.5, 0.0, uv.y);
  fog2 *= heightFalloff2;

  // Layer 3: Middle
  float fog3 = fbm(vec2(uv.x * 1.2 + driftTime * 0.8, uv.y * 1.3));
  float heightFalloff3 = smoothstep(0.6, 0.0, uv.y);
  fog3 *= heightFalloff3;

  // Layer 4: Mid-far
  float fog4 = fbm(vec2(uv.x * 0.9 + driftTime * 0.6, uv.y * 1.0));
  float heightFalloff4 = smoothstep(0.7, 0.0, uv.y);
  fog4 *= heightFalloff4;

  // Layer 5: Farthest, slowest, most diffuse
  float fog5 = fbm(vec2(uv.x * 0.6 + driftTime * 0.4, uv.y * 0.8));
  float heightFalloff5 = smoothstep(0.8, 0.0, uv.y);
  fog5 *= heightFalloff5;

  // Combine layers with depth-based weights (closer = more opaque)
  float fog = fog1 * 0.35 + fog2 * 0.25 + fog3 * 0.20 + fog4 * 0.12 + fog5 * 0.08;

  // Mouse interaction
  vec2 toMouse = uv - uMouse;
  float mouseDist = length(toMouse);
  float mouseSpeed = length(uMouseVelocity);

  // Fog emission from mouse with gravity
  // Create multiple "fog particles" at different ages that fall
  float emittedFog = 0.0;
  float gravitySpeed = 0.08; // How fast fog falls

  for (float i = 0.0; i < 8.0; i += 1.0) {
    // Time offset for each particle
    float age = mod(uTime * 2.0 + i * 0.3, 2.5);

    // Mouse position at this time offset (simulated trail)
    float trailOffset = i * 0.015;
    vec2 mouseTrailPos = uMouse;

    // Gravity: fog falls down over time
    float fallDistance = age * gravitySpeed;
    mouseTrailPos.y -= fallDistance;

    // Slight horizontal drift as fog falls
    mouseTrailPos.x += sin(age * 2.0 + i) * 0.02;

    // Distance from this fog particle
    float distToTrail = length(uv - mouseTrailPos);

    // Fog particle size and intensity (fades with age)
    float particleLife = 1.0 - (age / 2.5);
    float particleSize = 0.08 + age * 0.03; // Expands as it falls
    float particle = exp(-distToTrail / particleSize) * particleLife;

    // Only add if mouse is moving
    particle *= smoothstep(0.0, 0.3, mouseSpeed);

    emittedFog += particle * 0.15;
  }

  // Add emitted fog to base fog
  fog = clamp(fog + emittedFog, 0.0, 1.0);

  // Displacement effect (fog parts around mouse)
  float mouseInfluence = smoothstep(0.2, 0.0, mouseDist);

  if (mouseInfluence > 0.0) {
    vec2 displacement = normalize(uMouseVelocity) * mouseInfluence * mouseSpeed * 1.0;
    vec2 displacedUv = uv + displacement;

    // Sample fog at displaced position
    float fog1Displaced = fbm(vec2(displacedUv.x * 2.5 + driftTime * 1.2, displacedUv.y * 2.5));
    fog1Displaced *= smoothstep(0.4, 0.0, displacedUv.y);

    fog = mix(fog, fog1Displaced, mouseInfluence * 0.6);

    // Clearing at mouse position
    fog *= 1.0 - mouseInfluence * 0.7;
  }

  // Adjust fog density for layered system
  fog = pow(fog, 0.7) * 1.8;
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

  // Fog color with depth variation
  // Closer layers are lighter, farther layers are darker
  vec3 fogColorNear = vec3(0.30, 0.32, 0.35);
  vec3 fogColorFar = vec3(0.18, 0.20, 0.23);
  vec3 fogColor = mix(fogColorFar, fogColorNear, fog);

  // Mouse light - stronger and more visible
  float mouseLight = exp(-mouseDist * 2.0) * mouseSpeed * 5.0;
  fogColor += vec3(0.4, 0.45, 0.5) * mouseLight * fog;

  // Emitted fog glow (brighter where fog is fresh from mouse)
  fogColor += vec3(0.25, 0.28, 0.32) * emittedFog * 2.0;

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
      mouse.vx = (x - mouse.prevX) * 3.5;
      mouse.vy = (y - mouse.prevY) * 3.5;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x += (x - mouse.x) * 0.2;
      mouse.y += (y - mouse.y) * 0.2;
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

      // Decay velocity - slower for lingering effect
      mouseRef.current.vx *= 0.93;
      mouseRef.current.vy *= 0.93;

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
