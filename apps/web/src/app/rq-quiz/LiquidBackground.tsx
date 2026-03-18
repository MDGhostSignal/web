"use client";

import { useEffect, useRef } from "react";

/**
 * Liquid Background Animation for RQ Index
 * Based on GhostSignalLiquidWordmark but without text mask
 * Sophisticated fog that rises from bottom third of screen
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

  // Professional slow-moving flow field
  float n1 = fbm(vec2(p.x * 1.5 + uTime * 0.018, p.y * 1.9));
  float n2 = fbm(vec2(p.x * 2.2 + uTime * 0.012, p.y * 2.6));

  // Very gentle base flow
  vec2 flow = vec2(0.0008, 0.0); // Subtle right-to-left
  flow += 0.0012 * vec2(n1 - 0.5, n2 - 0.5);

  // Horizontal band that generates fog at bottom
  float right = smoothstep(-0.20, 1.15, p.x);

  // Bottom-third fog generation (vUv.y = 0 is bottom)
  float bottomMask = smoothstep(0.35, 0.0, vUv.y);
  float band = exp(-pow((p.y + 0.08 * sin(uTime * 0.15 + p.x * 3.6)) * 1.25, 2.0) * 8.0) * bottomMask;

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
    * (0.0015 + 0.0025 * mouseSpeed);

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

  // Much higher fog generation for strong visibility
  float source = (0.150 + 0.280 * n1) * right * (1.50 + 3.20 * band);
  source += mouseInfluence * (0.095 + 0.180 * mouseSpeed) * right;

  // High persistence for thick, heavy fog that lingers
  vec3 trail = prev * 0.9965 + vec3(source);
  trail *= 0.9996;

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

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  // Isotropic trail blur
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

  vec2 flowUv = uv + vec2(trail * 0.008, 0.0);

  // Professional volumetric fog - slow right-to-left drift
  float driftSpeed = 0.008; // Very slow, cinematic movement

  // Layer 1: Fine detail fog (closest)
  float n1 = fbm(vec2(flowUv.x * 2.5 + uTime * driftSpeed, flowUv.y * 2.8));
  float detailFog = smoothstep(0.15, 0.65, n1 + trail * 1.80);

  // Layer 2: Mid-range fog masses
  float n2 = fbm(vec2(flowUv.x * 1.5 + uTime * driftSpeed * 0.7, flowUv.y * 1.8));
  float midFog = smoothstep(0.10, 0.70, n2 + trail * 1.50);

  // Layer 3: Large background fog formations
  float n3 = fbm(vec2(flowUv.x * 0.8 + uTime * driftSpeed * 0.5, flowUv.y * 1.0));
  float backgroundFog = smoothstep(0.05, 0.75, n3 + trail * 1.20);

  // Combine layers with strong visibility
  float fog = detailFog * 2.80 + midFog * 2.20 + backgroundFog * 1.60;
  fog = clamp(fog * 1.40, 0.0, 1.0);

  // Volumetric height falloff - less aggressive for more visibility
  float heightFalloff = exp(-vUv.y * 1.8);
  fog *= heightFalloff;

  // Subtle mouse interaction - fog parts gently around cursor
  vec2 mouseP = uMouse * 2.0 - 1.0;
  mouseP.x *= uResolution.x / max(uResolution.y, 1.0);
  float mouseDist = length(p - mouseP);
  float mouseSpeed = clamp(length(uMouseVelocity) * 180.0, 0.0, 1.0);

  // Gentle fog parting (reduces fog near cursor)
  float mouseParting = exp(-mouseDist * 2.5) * (0.35 + 0.25 * mouseSpeed);
  fog = clamp(fog - mouseParting * 0.40, 0.0, 1.0);

  // Professional color grading - cool atmospheric palette with high visibility
  vec3 deepColor = vec3(0.015, 0.020, 0.030);      // Very dark blue-gray base
  vec3 fogColor = vec3(0.280, 0.295, 0.320);       // Much brighter cool gray
  vec3 highlightColor = vec3(0.750, 0.780, 0.820); // Bright blue-white highlights

  // Base fog color with strong presence
  vec3 col = mix(deepColor, fogColor, fog); // Linear for more visibility

  // Stronger ambient lighting from above
  float ambientLight = smoothstep(0.0, 0.6, vUv.y) * 0.35;
  col += highlightColor * ambientLight * fog;

  // More visible mouse-based local illumination
  float mouseGlow = exp(-mouseDist * 1.8) * mouseSpeed * fog * 0.28;
  col += highlightColor * mouseGlow;

  // Stars in upper portion (vUv.y = 1 is top)
  float starFade = smoothstep(0.4, 1.0, vUv.y) * (1.0 - fog * 0.7);
  float starField = stars(vUv, uTime * 0.2) * starFade;
  vec3 starColor = vec3(0.65, 0.75, 0.85) * starField * 0.25;
  col += starColor;

  // Stars behind fog
  col = starColor + col;

  // Film grain
  float frameA = floor(uTime * 24.0);
  float frameB = floor(uTime * 18.0 + 11.0);
  float grainHi = hash(gl_FragCoord.xy + vec2(17.0, 53.0) * frameA) - 0.5;
  float grainHi2 = hash(gl_FragCoord.yx + vec2(29.0, 31.0) * frameB) - 0.5;
  float grainLo = noise(gl_FragCoord.xy * 0.22 + vec2(frameA * 0.37, frameB * 0.23)) - 0.5;
  float tvStatic = hash(floor(gl_FragCoord.xy) + vec2(11.7, 5.3)) - 0.5;
  float flicker = 0.988 + 0.012 * (hash(vec2(frameA, frameB)) - 0.5) * 2.0;
  col *= flicker;
  col += grainHi * 0.010 + grainHi2 * 0.008 + grainLo * 0.006;
  col += tvStatic * 0.012;

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

export function LiquidBackground() {
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
