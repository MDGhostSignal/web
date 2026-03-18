"use client";

import { useEffect, useRef } from "react";

/**
 * Volumetric Fog Background using Raymarching
 * Industry-standard techniques:
 * - Raymarching for true 3D fog volume
 * - 3D Simplex noise for organic patterns
 * - Beer's Law for fog density
 * - Blue noise dithering
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
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uMousePrev;
uniform vec2 uMouseVelocity;

// ============================================
// 3D SIMPLEX NOISE (Ashima Arts / Stefan Gustavson)
// Industry-standard noise function
// ============================================

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ============================================
// FRACTIONAL BROWNIAN MOTION (Multi-octave Noise)
// ============================================

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  // 6 octaves for high detail
  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.1;
    amplitude *= 0.48;
  }

  return value;
}

// ============================================
// BLUE NOISE DITHERING
// Removes banding artifacts
// ============================================

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// ============================================
// FOG DENSITY FUNCTION
// Returns fog density at a 3D point
// ============================================

float fogDensity(vec3 pos, float time, vec3 mousePos, vec3 mousePrevPos, vec2 mouseVel, float mouseSpeed) {
  // Slow horizontal drift (right to left)
  pos.x += time * 0.015;

  // Physical displacement - mouse as solid object
  vec3 toMouse = pos - mousePos;
  float mouseDist = length(toMouse);

  // Very localized influence (small area like a physical object)
  float mouseRadius = 0.4; // Small radius
  float mouseInfluence = smoothstep(mouseRadius, 0.0, mouseDist);

  // Direction of mouse movement in 3D
  vec3 mouseDir3D = normalize(vec3(mouseVel.x, 0.0, mouseVel.y) + vec3(0.001));

  // Displacement: push fog away in direction of motion
  // Create a wake - fog gets pushed aside
  vec3 displacement = vec3(0.0);

  if (mouseInfluence > 0.0) {
    // Calculate how much this point is "in front of" the mouse
    vec3 mouseToPoint = normalize(toMouse + vec3(0.001));
    float alignment = dot(mouseToPoint, mouseDir3D);

    // Points in front get pushed forward, points behind create wake
    float wakeFactor = smoothstep(-0.3, 0.8, alignment);

    // Displacement magnitude based on speed and influence
    float displacementMag = mouseInfluence * mouseSpeed * 3.5 * wakeFactor;

    // Push fog away from mouse position
    displacement = mouseToPoint * displacementMag;

    // Add lateral displacement (fog spreads to the sides)
    vec3 lateral = cross(mouseDir3D, vec3(0.0, 1.0, 0.0));
    float lateralAmount = mouseInfluence * mouseSpeed * 1.2;
    displacement += lateral * lateralAmount * sin(mouseDist * 8.0);
  }

  // Apply displacement to sampling position
  vec3 displacedPos = pos + displacement;

  // Multiple layers of 3D noise for realistic fog
  float noise1 = fbm(displacedPos * 1.8);
  float noise2 = fbm(displacedPos * 0.9 + vec3(100.0, 50.0, 200.0));
  float noise3 = fbm(displacedPos * 2.4 + vec3(50.0, 150.0, 75.0));

  // Combine noise layers with higher density
  float density = noise1 * 0.5 + noise2 * 0.35 + noise3 * 0.25;
  density = (density + 1.0) * 0.5; // Remap from [-1,1] to [0,1]

  // Boost overall density
  density = pow(density, 0.7) * 1.6;

  // Exponential height falloff (more fog at bottom)
  float heightFalloff = exp(-displacedPos.y * 1.2);
  density *= heightFalloff;

  // Distance from center for natural dissipation
  float centerDist = length(displacedPos.xz);
  density *= exp(-centerDist * 0.08);

  // Strong clearing at mouse position (object displaces fog)
  float clearing = mouseInfluence * (0.7 + mouseSpeed * 0.3);
  density *= 1.0 - clearing;

  return clamp(density, 0.0, 1.0);
}

// ============================================
// RAYMARCHING
// Steps through 3D space accumulating fog
// ============================================

vec4 raymarchFog(vec3 rayOrigin, vec3 rayDir, float time, vec2 mouse, vec2 mousePrev, vec2 mouseVel) {
  const int MAX_STEPS = 48; // High quality
  const float MAX_DIST = 12.0;
  const float STEP_SIZE = MAX_DIST / float(MAX_STEPS);

  vec3 pos = rayOrigin;
  vec3 mousePos = vec3(mouse.x * 8.0 - 4.0, 1.5, mouse.y * 6.0);
  vec3 mousePrevPos = vec3(mousePrev.x * 8.0 - 4.0, 1.5, mousePrev.y * 6.0);
  float mouseSpeed = clamp(length(mouseVel) * 15.0, 0.0, 1.0);

  float totalDensity = 0.0;
  float transmittance = 1.0; // Beer's Law
  vec3 scatteredLight = vec3(0.0);

  // Blue noise offset for dithering
  float dither = hash(gl_FragCoord.xy + time) * STEP_SIZE;
  pos += rayDir * dither;

  for (int i = 0; i < MAX_STEPS; i++) {
    float density = fogDensity(pos, time, mousePos, mousePrevPos, mouseVel, mouseSpeed);

    if (density > 0.01) {
      // Beer's Law: exponential light absorption (increased multiplier for denser fog)
      float stepDensity = density * STEP_SIZE * 1.2;
      float stepTransmittance = exp(-stepDensity);

      // Light scattering
      vec3 lightColor = vec3(0.85, 0.9, 1.0); // Cool blue-white
      float lightContribution = density * (1.0 - stepTransmittance);

      // Ambient lighting (from above)
      float ambient = 0.4 + 0.3 * clamp(pos.y * 0.5, 0.0, 1.0);

      // Mouse interaction - enhanced light source at cursor
      float mouseDist = length(pos - mousePos);
      float mouseLight = exp(-mouseDist * 0.5) * (1.0 + mouseSpeed * 3.0);

      vec3 lighting = lightColor * (ambient + mouseLight);
      scatteredLight += lighting * lightContribution * transmittance;

      // Accumulate transmittance
      transmittance *= stepTransmittance;

      // Early exit if fog is very dense
      if (transmittance < 0.01) break;
    }

    pos += rayDir * STEP_SIZE;

    // Exit if beyond max distance
    if (length(pos - rayOrigin) > MAX_DIST) break;
  }

  float fogAmount = 1.0 - transmittance;
  return vec4(scatteredLight, fogAmount);
}

// ============================================
// MAIN
// ============================================

void main() {
  // Normalized pixel coordinates
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= uResolution.x / uResolution.y;

  // Camera setup
  vec3 cameraPos = vec3(0.0, 2.0, -5.0);
  vec3 lookAt = vec3(0.0, 1.5, 0.0);
  vec3 cameraDir = normalize(lookAt - cameraPos);
  vec3 cameraRight = normalize(cross(vec3(0.0, 1.0, 0.0), cameraDir));
  vec3 cameraUp = cross(cameraDir, cameraRight);

  // Ray direction
  float fov = 1.2;
  vec3 rayDir = normalize(cameraDir + uv.x * cameraRight * fov + uv.y * cameraUp * fov);

  // Raymarch fog
  vec4 fog = raymarchFog(cameraPos, rayDir, uTime, uMouse, uMousePrev, uMouseVelocity);

  // Background gradient (dark to slightly lighter at top)
  vec3 bgColor = mix(
    vec3(0.01, 0.015, 0.025),  // Very dark blue-gray at bottom
    vec3(0.04, 0.05, 0.08),    // Slightly lighter at top
    smoothstep(0.0, 1.0, vUv.y)
  );

  // Stars (simple)
  float star = 0.0;
  if (vUv.y > 0.5) {
    float starNoise = hash(floor(vUv * 400.0 + uTime * 0.01));
    if (starNoise > 0.998) {
      star = (starNoise - 0.998) * 500.0;
    }
  }
  bgColor += vec3(star) * 0.4;

  // Composite fog over background
  vec3 finalColor = mix(bgColor, fog.rgb, fog.a);

  // Subtle vignette
  float vignette = smoothstep(1.0, 0.3, length(uv * 0.6));
  finalColor *= 0.7 + 0.3 * vignette;

  // Gamma correction
  finalColor = pow(finalColor, vec3(1.0 / 2.2));

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export default function VolumetricFog() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, prevX: 0.5, prevY: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    glRef.current = gl;

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

    // Link program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
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
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uMousePrev = gl.getUniformLocation(program, "uMousePrev");
    const uMouseVelocity = gl.getUniformLocation(program, "uMouseVelocity");

    // Handle resize
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
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

      // Calculate velocity with increased sensitivity
      mouse.vx = (x - mouse.prevX) * 2.5;
      mouse.vy = (y - mouse.prevY) * 2.5;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      // More responsive mouse movement
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
      gl.uniform2f(uMousePrev, mouseRef.current.prevX, mouseRef.current.prevY);
      gl.uniform2f(uMouseVelocity, mouseRef.current.vx, mouseRef.current.vy);

      // Decay mouse velocity (very slow decay for lingering momentum)
      mouseRef.current.vx *= 0.92;
      mouseRef.current.vy *= 0.92;

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
