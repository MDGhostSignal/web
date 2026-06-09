"use client";

import { useEffect, useRef } from "react";

/**
 * XQFog — recovered from `apps/web/src/app/rq-index/LiquidBackground.tsx`
 * at commit 7984912 ("feat(rq): add layered fog depth and volumetric
 * lighting"). The version the user remembered: dual-pass trail
 * texture for true fluid fog, right-side gradient (`right`
 * smoothstep on p.x), bottom-third generation band, swirling
 * mouse interaction, volumetric scattered lighting.
 *
 * Renamed default export to XQFog so /xq-quiz can consume it
 * without colliding with any other instance.
 */

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = 0.5 * aPosition + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const UPDATE_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uTexel;
uniform sampler2D uPrevTrail;
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  // Quintic smoothing reduces grid/diamond interpolation artifacts
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  return mix(a, b, u.x) +
    (c - a) * u.y * (1.0 - u.x) +
    (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);

  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = rot * p * 2.02 + vec2(5.43, 3.17);
    amp *= 0.52;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  // FBM-based flow
  float n1 = fbm(vec2(p.x * 1.8 - uTime * 0.042, p.y * 2.3 + uTime * 0.020));
  float n2 = fbm(vec2(p.x * 3.1 + uTime * 0.031, p.y * 3.9 - uTime * 0.016));

  // Downward drift — very slow vertical fall (~12s to traverse the
  // viewport from the top emitter down to the CTA), with a faint
  // leftward sway for organic motion. Combined with the ambient
  // column source below + higher trail persistence, this fills the
  // whole page rather than only the top quarter.
  vec2 baseFlow = vec2(-0.0003, -0.0014);

  vec2 flow = baseFlow;
  flow += 0.0020 * vec2(n1 - 0.5, n2 - 0.5);

  // (Text-mask interaction removed — used to create Grok-style
  // letter-avoidance swirls around a phantom XQ at viewport center,
  // but that was leaving ghost double-layered XQ shapes visible
  // in the fog, especially after resize. The wordmark is now a
  // foreground SVG, so the fog doesn't need to know about it.)

  // Top-center oval emitter — horizontal slit sitting behind the
  // X and Q letters. Two-thirds of the viewport wide, one-sixth
  // tall, anchored near the top so fog spills downward across
  // the wordmark. Anisotropic Gaussian: normalize the offset by
  // the oval's half-axes (uv space) so the falloff is elliptical.
  vec2 emitterCenter = vec2(0.5, 0.86);
  vec2 ovalHalf = vec2(2.0 / 5.0, 1.0 / 12.0);
  vec2 ovalD = (uv - emitterCenter) / ovalHalf;
  float ovalDist2 = dot(ovalD, ovalD);
  float rightCenterSource = exp(-ovalDist2 * 2.4);
  // (Breathing sin modulation removed — read as a slow purple blink
  // at the oval. Steady source feels cleaner against the new
  // turquoise palette.)

  // Mouse interaction with swirling
  vec2 mouseP = uMouse * 2.0 - 1.0;
  mouseP.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 mouseDelta = p - mouseP;
  float mouseDist = length(p - mouseP);
  float mouseInfluence = exp(-mouseDist * 5.2);
  float mouseSpeed = clamp(length(uMouseVelocity) * 120.0, 0.0, 1.0);

  // Swirl system from original
  float swirlPhase = uTime * 0.12;
  float swirlStep = floor(swirlPhase);
  float swirlMix = smoothstep(0.18, 0.82, fract(swirlPhase));
  float swirlAngleA = mix(-1.05, 1.05, hash(vec2(swirlStep, 19.7)));
  float swirlAngleB = mix(-1.05, 1.05, hash(vec2(swirlStep + 1.0, 19.7)));
  float swirlAngle = mix(swirlAngleA, swirlAngleB, swirlMix);
  float swirlDirA = mix(-1.0, 1.0, step(0.5, hash(vec2(swirlStep, 53.1))));
  float swirlDirB = mix(-1.0, 1.0, step(0.5, hash(vec2(swirlStep + 1.0, 53.1))));
  float swirlDir = mix(swirlDirA, swirlDirB, swirlMix);
  mat2 swirlRot = mat2(cos(swirlAngle), -sin(swirlAngle), sin(swirlAngle), cos(swirlAngle));
  vec2 swirlVec = swirlRot * vec2(-mouseDelta.y, mouseDelta.x) * swirlDir;

  flow += normalize(swirlVec + vec2(1e-6))
    * mouseInfluence
    * (0.002 + 0.004 * mouseSpeed);

  vec2 uvFlow = uv - flow;

  // Isotropic sampling (60° angles) to avoid square artifacts
  vec2 t = uTexel;
  vec2 d1 = vec2(0.8660254 * t.x, 0.5000000 * t.y);
  vec2 d2 = vec2(-0.5000000 * t.x, 0.8660254 * t.y);
  vec2 d3 = vec2(-0.8660254 * t.x, -0.5000000 * t.y);
  vec2 d4 = vec2(0.5000000 * t.x, -0.8660254 * t.y);

  vec3 prev = texture2D(uPrevTrail, uvFlow).rgb * 0.46;
  prev += texture2D(uPrevTrail, uvFlow + d1).rgb * 0.10;
  prev += texture2D(uPrevTrail, uvFlow + d2).rgb * 0.10;
  prev += texture2D(uPrevTrail, uvFlow + d3).rgb * 0.10;
  prev += texture2D(uPrevTrail, uvFlow + d4).rgb * 0.10;
  prev += texture2D(uPrevTrail, uvFlow + (d1 + d2) * 0.5).rgb * 0.035;
  prev += texture2D(uPrevTrail, uvFlow + (d2 + d3) * 0.5).rgb * 0.035;
  prev += texture2D(uPrevTrail, uvFlow + (d3 + d4) * 0.5).rgb * 0.035;
  prev += texture2D(uPrevTrail, uvFlow + (d4 + d1) * 0.5).rgb * 0.035;

  // Source: emission from the top oval (strongest at the source)
  // plus a faint ambient column distributed along the vertical
  // extent of the page. The column is what makes the fog reach
  // the bottom of the viewport — without it, diffusion + decay
  // drain the top emission before it can fall all the way down.
  float source = rightCenterSource * (0.018 + 0.036 * n1);
  source += mouseInfluence * (0.025 + 0.050 * mouseSpeed) * rightCenterSource;

  // Ambient column — Gaussian horizontally (centered on the same
  // x as the oval emitter), ramps from 0 at the top of the
  // viewport down to full strength near the bottom. Intensity
  // tuned so the trail equilibrium at the bottom is ~0.35 (visible
  // but not saturated), while the top stays dominated by the oval.
  float ambientX = exp(-pow((uv.x - 0.5) * 1.6, 2.0));
  float ambientY = smoothstep(0.95, 0.0, uv.y);
  source += ambientX * ambientY * 0.00045 * (0.7 + 0.3 * n2);

  // Persistence + mortality combine to ~0.9988/frame, half-life
  // ~9 seconds. Combined with the slow downward drift and the
  // brighter fogCol below, this is what makes the spill remain
  // visible all the way down to the CTA. Source clamps to 1.0
  // regardless of persistence so the top look stays unchanged;
  // higher persistence only affects how long fog persists OFF
  // the emitter as it falls.
  vec3 trail = prev * 0.999 + vec3(source);
  trail *= 0.9998;

  gl_FragColor = vec4(clamp(trail, 0.0, 1.0), 1.0);
}
`;

const RENDER_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uTexel;
uniform sampler2D uTrailTexture;
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  return mix(a, b, u.x) +
    (c - a) * u.y * (1.0 - u.x) +
    (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.79, -0.61, 0.61, 0.79);

  for (int i = 0; i < 6; i++) {
    value += amp * noise(p);
    p = rot * p * 2.04 + vec2(7.11, 2.39);
    amp *= 0.52;
  }

  return value;
}

// Star field generation
float stars(vec2 uv, float time) {
  vec2 starUv = uv * 200.0;
  vec2 starId = floor(starUv);
  vec2 starLocal = fract(starUv);

  float brightness = 0.0;

  for (float y = -1.0; y <= 1.0; y += 1.0) {
    for (float x = -1.0; x <= 1.0; x += 1.0) {
      vec2 offset = vec2(x, y);
      vec2 cellId = starId + offset;

      float starRandom = hash(cellId);

      if (starRandom > 0.95) {
        vec2 starPos = offset + vec2(hash(cellId + vec2(1.0, 0.0)), hash(cellId + vec2(0.0, 1.0)));
        vec2 toStar = starLocal - starPos;
        float dist = length(toStar);

        float starSize = 0.02 + hash(cellId + vec2(2.0, 3.0)) * 0.01;

        if (dist < starSize) {
          float twinkleSpeed = 0.5 + hash(cellId + vec2(4.0, 5.0)) * 1.5;
          float twinkle = 0.3 + 0.7 * (0.5 + 0.5 * sin(time * twinkleSpeed + starRandom * 6.28));

          float star = (1.0 - smoothstep(0.0, starSize, dist)) * twinkle;
          brightness += star;
        }
      }
    }
  }

  return clamp(brightness, 0.0, 1.0);
}

// =====================================================================
// Render pass — minimal, dim fog. No stars, no rim glow, no volumetric
// light additives. Trail texture → dim gray fog over a dark background,
// with the letter mask carved out as white. Mouse cursor adds a very
// subtle local glow.
// =====================================================================
void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  // Soft trail blur via isotropic 60° sampling (no banding)
  vec2 t = uTexel;
  vec2 d1 = vec2(0.8660254 * t.x, 0.5000000 * t.y);
  vec2 d2 = vec2(-0.5000000 * t.x, 0.8660254 * t.y);
  vec2 d3 = vec2(-0.8660254 * t.x, -0.5000000 * t.y);
  vec2 d4 = vec2(0.5000000 * t.x, -0.8660254 * t.y);

  float trail = texture2D(uTrailTexture, uv).r * 0.46;
  trail += texture2D(uTrailTexture, uv + d1).r * 0.10;
  trail += texture2D(uTrailTexture, uv + d2).r * 0.10;
  trail += texture2D(uTrailTexture, uv + d3).r * 0.10;
  trail += texture2D(uTrailTexture, uv + d4).r * 0.10;
  trail += texture2D(uTrailTexture, uv + (d1 + d2) * 0.5).r * 0.035;
  trail += texture2D(uTrailTexture, uv + (d2 + d3) * 0.5).r * 0.035;
  trail += texture2D(uTrailTexture, uv + (d3 + d4) * 0.5).r * 0.035;
  trail += texture2D(uTrailTexture, uv + (d4 + d1) * 0.5).r * 0.035;

  // Soft FBM modulation breaks up the trail into wispy structure
  float wispNoise = fbm(vec2(uv.x * 2.5 - uTime * 0.03, uv.y * 3.0 + uTime * 0.015));

  // Fog density: trail directly, modulated by wisp noise. No
  // smoothstep thresholding, no exponentiation, no multipliers
  // above 1.0. Trail value 0..1 → fog value 0..1.
  float fog = clamp(trail * (0.55 + 0.45 * wispNoise), 0.0, 1.0);

  // Color palette — fog does NOT emit light. Background is deep
  // blue-black; fog body caps at ~10% brightness.
  // (Letter mask was previously sampled here to carve white XQ
  // pixels into the fog canvas; that was a leftover from when the
  // wordmark lived inside the fog. Now the wordmark is a foreground
  // SVG, so the carve is removed — otherwise a massive white XQ
  // appeared at viewport center whenever the canvas was resized
  // after initial mount with width=0 had skipped the mask upload.)
  vec3 bg     = vec3(0.020, 0.026, 0.034);
  vec3 fogCol = vec3(0.12, 0.22, 0.28);

  // Compose: background → fog → letters (in that depth order)
  vec3 col = mix(bg, fogCol, fog);

  // Emitter light — matches the UPDATE-pass oval (top-center,
  // 2/3 wide × 1/6 tall, sitting behind XQ). Anisotropic falloff
  // in uv space so the light spreads across the oval rather than
  // peaking at a hot point. Magnitude dialed down hard so the
  // formerly-bright white blow-out becomes a soft purple bloom.
  vec2 emitterCenter = vec2(0.5, 0.86);
  vec2 emitterHalf = vec2(2.0 / 5.0, 1.0 / 12.0);
  vec2 emitterD = (uv - emitterCenter) / emitterHalf;
  float emitterDist2 = dot(emitterD, emitterD);
  float emitterLight = exp(-emitterDist2 * 2.4) * 0.012;
  emitterLight *= 0.6 + 0.4 * fog;
  col += vec3(0.20, 0.42, 0.58) * emitterLight;

  // Downward light cast — replaces the previous right-to-left
  // horizontal beam. Now the oval at the top emits a soft wash
  // that spills downward across the wordmark, illuminating fog
  // as it drifts down. horizontalBand widens the spill across the
  // oval's width; topFalloff lets brightness peak just below the
  // emitter and decay toward the bottom of the viewport.
  float horizontalBand = exp(-p.x * p.x * 0.9);
  float topFalloff = smoothstep(-1.05, 0.85, uv.y);
  float downwardBeam = horizontalBand * topFalloff;
  downwardBeam *= 0.25 + 0.75 * fog;
  col += vec3(0.16, 0.36, 0.50) * downwardBeam * 0.015;

  // ============================================
  // Background starfield — single-pixel stars scattered across a
  // dense grid (only ~2.5% of cells host a star). Each star has its
  // own twinkle period (6-12s) and phase so they brighten and dim
  // out of sync. Dimmed where fog is dense for occlusion.
  // ============================================
  {
    vec2 starGrid = uv * 340.0;
    vec2 starCell = floor(starGrid);
    vec2 starLocal = fract(starGrid);
    float starHash = hash(starCell);
    if (starHash > 0.975) {
      vec2 starPos = vec2(
        hash(starCell + vec2(1.7, 5.1)),
        hash(starCell + vec2(3.2, 7.4))
      );
      float starDist = distance(starLocal, starPos);
      // Tight smoothstep → ~1-2px star at typical resolutions
      float starDot = smoothstep(0.045, 0.0, starDist);
      // Slow twinkle: each star has its own 6-12s period + phase
      float period = 6.0 + 6.0 * hash(starCell + vec2(9.0, 2.0));
      float twinkle = 0.35 + 0.65 *
        (0.5 + 0.5 * sin(uTime * 6.2832 / period + starHash * 6.2832));
      float starBrightness = starDot * twinkle * (0.55 + 0.45 * starHash);
      // Fog occludes stars where it's dense
      starBrightness *= 1.0 - fog * 0.55;
      col += vec3(0.78, 0.82, 0.95) * starBrightness * 0.075;
    }
  }

  // Mouse cursor — very subtle local glow, max ~5% brightness
  vec2 mouseP = uMouse * 2.0 - 1.0;
  mouseP.x *= uResolution.x / max(uResolution.y, 1.0);
  float mouseDist = length(p - mouseP);
  float mouseGlow = exp(-mouseDist * 4.0) * 0.05;
  col += vec3(0.18, 0.20, 0.26) * mouseGlow;

  // Soft film grain for analog texture (very subtle, ±0.4% noise)
  float grain = (hash(gl_FragCoord.xy + vec2(floor(uTime * 24.0))) - 0.5) * 0.008;
  col += grain;

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function createTexture(gl: WebGLRenderingContext, width: number, height: number) {
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

function createFramebuffer(gl: WebGLRenderingContext, texture: WebGLTexture) {
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) return null;

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return framebuffer;
}

export default function XQFog() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false }) ||
      canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false })) as WebGLRenderingContext | null;

    if (!gl) {
      console.warn("WebGL not supported");
      return;
    }

    const updateProgram = createProgram(gl, VERTEX_SHADER, UPDATE_FRAGMENT_SHADER);
    const renderProgram = createProgram(gl, VERTEX_SHADER, RENDER_FRAGMENT_SHADER);

    if (!updateProgram || !renderProgram) return;

    const quad = gl.createBuffer();
    if (!quad) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const updatePosLoc = gl.getAttribLocation(updateProgram, "aPosition");
    const renderPosLoc = gl.getAttribLocation(renderProgram, "aPosition");

    const updateUniforms = {
      time: gl.getUniformLocation(updateProgram, "uTime"),
      resolution: gl.getUniformLocation(updateProgram, "uResolution"),
      texel: gl.getUniformLocation(updateProgram, "uTexel"),
      prevTrail: gl.getUniformLocation(updateProgram, "uPrevTrail"),
      mouse: gl.getUniformLocation(updateProgram, "uMouse"),
      mouseVelocity: gl.getUniformLocation(updateProgram, "uMouseVelocity"),
    };

    const renderUniforms = {
      time: gl.getUniformLocation(renderProgram, "uTime"),
      resolution: gl.getUniformLocation(renderProgram, "uResolution"),
      texel: gl.getUniformLocation(renderProgram, "uTexel"),
      trail: gl.getUniformLocation(renderProgram, "uTrailTexture"),
      mouse: gl.getUniformLocation(renderProgram, "uMouse"),
      mouseVelocity: gl.getUniformLocation(renderProgram, "uMouseVelocity"),
    };

    let trailRead: WebGLTexture | null = null;
    let trailWrite: WebGLTexture | null = null;
    let fbRead: WebGLFramebuffer | null = null;
    let fbWrite: WebGLFramebuffer | null = null;
    const mouseTarget = { x: 0.86, y: 0.56 };
    const mouseInertia = { x: 0.86, y: 0.56 };
    const mouseVelocity = { x: 0, y: 0 };

    const bindQuad = (location: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    };

    const allocateTrail = (width: number, height: number) => {
      if (trailRead) gl.deleteTexture(trailRead);
      if (trailWrite) gl.deleteTexture(trailWrite);
      if (fbRead) gl.deleteFramebuffer(fbRead);
      if (fbWrite) gl.deleteFramebuffer(fbWrite);

      trailRead = createTexture(gl, width, height);
      trailWrite = createTexture(gl, width, height);
      if (!trailRead || !trailWrite) return;

      fbRead = createFramebuffer(gl, trailRead);
      fbWrite = createFramebuffer(gl, trailWrite);
      if (!fbRead || !fbWrite) return;

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbRead);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbWrite);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const resize = () => {
      const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      const width = Math.floor(canvas.clientWidth * ratio);
      const height = Math.floor(canvas.clientHeight * ratio);
      if (width <= 0 || height <= 0) return;

      canvas.width = width;
      canvas.height = height;

      gl.viewport(0, 0, width, height);
      allocateTrail(width, height);
    };

    resize();

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = (event.clientX - rect.left) / rect.width;
      // WebGL UV origin is bottom-left; DOM pointer origin is top-left
      const y = 1 - (event.clientY - rect.top) / rect.height;

      mouseTarget.x = Math.max(0, Math.min(1, x));
      mouseTarget.y = Math.max(0, Math.min(1, y));
    };

    let raf = 0;
    const start = performance.now();

    const render = () => {
      if (!trailRead || !trailWrite || !fbWrite) {
        raf = window.requestAnimationFrame(render);
        return;
      }

      const time = (performance.now() - start) * 0.001;
      const texelX = 1 / Math.max(canvas.width, 1);
      const texelY = 1 / Math.max(canvas.height, 1);
      const prevMouseX = mouseInertia.x;
      const prevMouseY = mouseInertia.y;

      // Mouse inertia - fog lags behind pointer slightly
      mouseInertia.x += (mouseTarget.x - mouseInertia.x) * 0.055;
      mouseInertia.y += (mouseTarget.y - mouseInertia.y) * 0.055;
      mouseVelocity.x = mouseInertia.x - prevMouseX;
      mouseVelocity.y = mouseInertia.y - prevMouseY;

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbWrite);
      gl.useProgram(updateProgram);
      bindQuad(updatePosLoc);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, trailRead);
      gl.uniform1i(updateUniforms.prevTrail, 0);

      gl.uniform1f(updateUniforms.time, time);
      gl.uniform2f(updateUniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(updateUniforms.texel, texelX, texelY);
      gl.uniform2f(updateUniforms.mouse, mouseInertia.x, mouseInertia.y);
      gl.uniform2f(updateUniforms.mouseVelocity, mouseVelocity.x, mouseVelocity.y);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(renderProgram);
      bindQuad(renderPosLoc);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, trailWrite);
      gl.uniform1i(renderUniforms.trail, 0);

      gl.uniform1f(renderUniforms.time, time);
      gl.uniform2f(renderUniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(renderUniforms.texel, texelX, texelY);
      gl.uniform2f(renderUniforms.mouse, mouseInertia.x, mouseInertia.y);
      gl.uniform2f(renderUniforms.mouseVelocity, mouseVelocity.x, mouseVelocity.y);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      const nextRead = trailWrite;
      trailWrite = trailRead;
      trailRead = nextRead;

      const nextFb = fbWrite;
      fbWrite = fbRead;
      fbRead = nextFb;

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(raf);

      if (trailRead) gl.deleteTexture(trailRead);
      if (trailWrite) gl.deleteTexture(trailWrite);
      if (fbRead) gl.deleteFramebuffer(fbRead);
      if (fbWrite) gl.deleteFramebuffer(fbWrite);
      gl.deleteBuffer(quad);
      gl.deleteProgram(updateProgram);
      gl.deleteProgram(renderProgram);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
