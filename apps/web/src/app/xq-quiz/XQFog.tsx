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
uniform sampler2D uTextMask;
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

  // Leftward drift — fast enough that the fog visibly travels
  // across the screen rather than piling up at the source.
  vec2 baseFlow = vec2(-0.0028, -0.0003);

  vec2 flow = baseFlow;
  flow += 0.0020 * vec2(n1 - 0.5, n2 - 0.5);

  // ============================================
  // TEXT MASK INTERACTION — Grok-style letter avoidance
  // The XQ wordmark is uploaded as a mask texture. Fog flows
  // around the letter contours: gradient-based repulsion pushes
  // flow vectors away from letter interiors, and the perpendicular
  // (tangent) component induces swirl along the edges so the fog
  // visibly curls around the letters instead of passing through.
  // ============================================
  vec2 mt = vec2(1.0 / 256.0); // text mask sampling delta
  float maskC = texture2D(uTextMask, uv).r;
  float maskR = texture2D(uTextMask, uv + vec2(mt.x, 0.0)).r;
  float maskL = texture2D(uTextMask, uv - vec2(mt.x, 0.0)).r;
  float maskU = texture2D(uTextMask, uv + vec2(0.0, mt.y)).r;
  float maskD = texture2D(uTextMask, uv - vec2(0.0, mt.y)).r;
  vec2 maskGrad = vec2(maskR - maskL, maskU - maskD);
  float maskEdge = length(maskGrad);

  // Repulsion: flow pushes outward from letter interior. Stronger
  // than before so fog visibly diverts around the letter shapes.
  flow += maskGrad * 0.034;

  // Edge tangent swirl: perpendicular to gradient. Composed of a
  // strong CONSTANT swirl (always circulating) plus a modulated
  // sine component (varies the local direction over time so the
  // swirl doesn't look mechanical). The constant component is what
  // creates the visible "curling around letters" effect — fog
  // always follows the contour, not just passes by.
  vec2 tangent = vec2(-maskGrad.y, maskGrad.x);
  flow += tangent * maskEdge * 0.028;
  flow += tangent * maskEdge * 0.018 * sin(uTime * 0.4 + uv.x * 8.0 + uv.y * 6.0);

  // Right-center emitter — wider Gaussian (1.8 vs 3.5) so the
  // source spreads more broadly and fog accumulates as it drifts.
  // Subtle breathing modulation prevents a fixed-valve look.
  vec2 emitterCenter = vec2(0.85, 0.0);
  float emitterDist = length(p - emitterCenter);
  float rightCenterSource = exp(-emitterDist * emitterDist * 1.8);
  rightCenterSource *= 0.85 + 0.15 * sin(uTime * 0.22);

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

  // Source: emission ONLY from the right-center spot. The ambient
  // drizzle was saturating the trail screen-wide; removed entirely.
  // Source intensity dialed way down so even at equilibrium the
  // trail value stays well under saturation.
  float source = rightCenterSource * (0.018 + 0.036 * n1);
  source += mouseInfluence * (0.025 + 0.050 * mouseSpeed) * rightCenterSource;

  // Letter interior: heavily suppress fog generation so the letters
  // are voids the fog has to flow around rather than fill
  source *= 1.0 - maskC * 0.95;

  // Trail persistence dropped 0.997 → 0.985 so fog decays in
  // about half a second instead of accumulating indefinitely.
  // This is what makes the drift visible — old fog clears, new
  // fog appears at the source, you can see it travel.
  vec3 trail = prev * 0.985 + vec3(source);
  trail *= 0.998;

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
uniform sampler2D uTextMask;
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

  // Letter mask — sample for the white-letter carve-out
  float maskC = texture2D(uTextMask, vUv).r;

  // Color palette — fog does NOT emit light. Background is deep
  // blue-black; fog body caps at ~10% brightness; letters are
  // pure white where the mask is opaque.
  vec3 bg     = vec3(0.020, 0.022, 0.030);
  vec3 fogCol = vec3(0.10, 0.11, 0.13);
  vec3 letterCol = vec3(0.96, 0.96, 0.98);

  // Compose: background → fog → letters (in that depth order)
  vec3 col = mix(bg, fogCol, fog);

  // Emitter light — a subtle cinematic light source at the right-
  // center (matches where the UPDATE pass spawns fog). Tight
  // Gaussian falloff so it stays a discrete glow, magnitude kept
  // low so it never blows out. Slight blue-magenta tint for the
  // cinematic cast.
  vec2 emitterP = vec2(0.85, 0.0);
  emitterP.x *= uResolution.x / max(uResolution.y, 1.0);
  float emitterDist = length(p - emitterP);
  float emitterLight = exp(-emitterDist * emitterDist * 4.0) * 0.16;
  emitterLight *= 0.4 + 0.6 * fog;
  col += vec3(0.34, 0.28, 0.52) * emitterLight;

  // Horizontal light cast — the previously-loved beam that travels
  // ACROSS the screen from the right-center emitter. Two factors:
  //   1. verticalBand = narrow horizontal band centered at p.y=0
  //   2. rightFalloff = brightness gradient peaking at the right
  //      and softly diminishing leftward
  // Result: a horizontal sweep of light that illuminates mist as
  // it drifts across the page. Vertical band is wider than a sharp
  // beam so it spills naturally; horizontal falloff is gentle so
  // the light reaches well into the left half.
  float verticalBand = exp(-p.y * p.y * 1.8);
  float rightFalloff = smoothstep(-1.10, 0.95, p.x);
  float horizontalBeam = verticalBand * rightFalloff;
  // Coupled to fog density so the light reads as scattered through
  // mist rather than a glow drawn on top of black.
  horizontalBeam *= 0.25 + 0.75 * fog;
  col += vec3(0.30, 0.24, 0.46) * horizontalBeam * 0.18;

  col = mix(col, letterCol, maskC);

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
      textMask: gl.getUniformLocation(updateProgram, "uTextMask"),
      mouse: gl.getUniformLocation(updateProgram, "uMouse"),
      mouseVelocity: gl.getUniformLocation(updateProgram, "uMouseVelocity"),
    };

    const renderUniforms = {
      time: gl.getUniformLocation(renderProgram, "uTime"),
      resolution: gl.getUniformLocation(renderProgram, "uResolution"),
      texel: gl.getUniformLocation(renderProgram, "uTexel"),
      trail: gl.getUniformLocation(renderProgram, "uTrailTexture"),
      textMask: gl.getUniformLocation(renderProgram, "uTextMask"),
      mouse: gl.getUniformLocation(renderProgram, "uMouse"),
      mouseVelocity: gl.getUniformLocation(renderProgram, "uMouseVelocity"),
    };

    // ============================================
    // TEXT MASK TEXTURE — offscreen canvas rendering "XQ" italic
    // bold, uploaded as a GL texture. The fog shaders sample it
    // to deflect flow around letter edges and brighten contours
    // where fog meets the letters.
    // ============================================
    const textCanvas = document.createElement("canvas");
    const tctx = textCanvas.getContext("2d");

    const textMaskTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const renderTextMask = (vw: number, vh: number) => {
      if (!tctx || !textMaskTexture) return;
      const W = 1024;
      const H = Math.max(64, Math.floor(W * (vh / Math.max(vw, 1))));
      textCanvas.width = W;
      textCanvas.height = H;
      tctx.fillStyle = "#000";
      tctx.fillRect(0, 0, W, H);
      const fontPx = Math.floor(Math.min(W * 0.34, H * 0.78));
      tctx.fillStyle = "#fff";
      tctx.font = `italic 800 ${fontPx}px Inter, "Segoe UI", -apple-system, sans-serif`;
      tctx.textAlign = "center";
      tctx.textBaseline = "middle";
      tctx.fillText("XQ", W / 2, H / 2);

      gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
      // Flip Y so the canvas top-down aligns with WebGL bottom-up UV
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        textCanvas,
      );
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
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
      if (textMaskTexture) gl.deleteTexture(textMaskTexture);
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
      renderTextMask(width, height);
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

      // Text mask bound to unit 1 for the UPDATE pass
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
      gl.uniform1i(updateUniforms.textMask, 1);

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

      // Text mask bound to unit 1 for the RENDER pass
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textMaskTexture);
      gl.uniform1i(renderUniforms.textMask, 1);

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
      if (textMaskTexture) gl.deleteTexture(textMaskTexture);
      if (fbRead) gl.deleteFramebuffer(fbRead);
      if (fbWrite) gl.deleteFramebuffer(fbWrite);
      gl.deleteBuffer(quad);
      gl.deleteProgram(updateProgram);
      gl.deleteProgram(renderProgram);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
}
