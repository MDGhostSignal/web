"use client";

import { useEffect, useRef } from "react";

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
uniform sampler2D uMaskTexture;
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

  // Quintic smoothing reduces grid/diamond interpolation artifacts.
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

  vec4 m = texture2D(uMaskTexture, uv);
  float alpha = m.a;
  float mx1 = texture2D(uMaskTexture, uv + vec2(uTexel.x, 0.0)).a;
  float mx2 = texture2D(uMaskTexture, uv - vec2(uTexel.x, 0.0)).a;
  float my1 = texture2D(uMaskTexture, uv + vec2(0.0, uTexel.y)).a;
  float my2 = texture2D(uMaskTexture, uv - vec2(0.0, uTexel.y)).a;

  vec2 grad = vec2(mx1 - mx2, my1 - my2);
  float gradLen = length(grad);
  vec2 normal = normalize(grad + vec2(1e-6));

  float edge = smoothstep(0.01, 0.22, gradLen) * (1.0 - alpha);

  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  float n1 = fbm(vec2(p.x * 1.8 - uTime * 0.042, p.y * 2.3 + uTime * 0.020));
  float n2 = fbm(vec2(p.x * 3.1 + uTime * 0.031, p.y * 3.9 - uTime * 0.016));

  vec2 flow = vec2(-0.0014, 0.0);
  flow += 0.0020 * vec2(n1 - 0.5, n2 - 0.5);
  flow += normal * edge * 0.0034;
  float right = smoothstep(-0.20, 1.15, p.x);
  float band = exp(-pow((p.y + 0.08 * sin(uTime * 0.15 + p.x * 3.6)) * 1.25, 2.0) * 8.0);

  vec2 mouseP = uMouse * 2.0 - 1.0;
  mouseP.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 mouseDelta = p - mouseP;
  float mouseDist = length(p - mouseP);
  float mouseInfluence = exp(-mouseDist * 5.2);
  float mouseSpeed = clamp(length(uMouseVelocity) * 270.0, 0.0, 1.0);
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
    * (0.007 + 0.016 * mouseSpeed);

  vec2 uvFlow = uv - flow;

  // Isotropic sampling footprint (non-axis aligned) to avoid square/diamond artifacts.
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

  float source = (0.010 + 0.052 * n1) * right * (0.38 + 0.84 * band);
  source += edge * 0.060 * right;
  source += alpha * (0.018 + 0.024 * right);
  source += mouseInfluence * (0.020 + 0.056 * mouseSpeed) * right;

  vec3 trail = prev * 0.982 + vec3(source);
  trail *= 0.9993;

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
uniform sampler2D uMaskTexture;
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

  // Quintic smoothing reduces grid/diamond interpolation artifacts.
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

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  // Isotropic trail blur in render path to remove geometric footprinting.
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

  vec4 m = texture2D(uMaskTexture, uv);
  float alpha = m.a;
  float mx1 = texture2D(uMaskTexture, uv + vec2(uTexel.x, 0.0)).a;
  float mx2 = texture2D(uMaskTexture, uv - vec2(uTexel.x, 0.0)).a;
  float my1 = texture2D(uMaskTexture, uv + vec2(0.0, uTexel.y)).a;
  float my2 = texture2D(uMaskTexture, uv - vec2(0.0, uTexel.y)).a;

  vec2 grad = vec2(mx1 - mx2, my1 - my2);
  float gradLen = length(grad);
  float edge = smoothstep(0.015, 0.24, gradLen) * (1.0 - alpha);
  vec2 distort = normalize(grad + vec2(1e-6)) * edge * 0.030;
  vec2 flowUv = uv + distort + vec2(trail * 0.010, 0.0);

  float n1 = fbm(vec2(flowUv.x * 1.9 - uTime * 0.026, flowUv.y * 2.2 + uTime * 0.013));
  float n2 = fbm(vec2(flowUv.x * 3.5 + uTime * 0.017, flowUv.y * 4.6 - uTime * 0.021));

  float right = smoothstep(-0.10, 1.10, p.x);
  float rightGlow = pow(max(p.x + 0.18, 0.0), 1.3);
  float verticalBand = exp(-pow((p.y + 0.10 * sin(uTime * 0.10 + p.x * 2.4)) * 1.28, 2.0) * 7.0);
  float leftFade = smoothstep(-1.05, 0.50, p.x);

  float baseFog = smoothstep(0.00, 0.80, n1 * 0.79 + n2 * 0.40 + trail * 1.22);
  // Add larger, slower cloud masses so the fog reads as thicker banks instead of fine haze.
  float cloudMassNoise = fbm(vec2(flowUv.x * 0.75 - uTime * 0.008, flowUv.y * 0.95 + uTime * 0.006));
  float cloudMass = smoothstep(0.34, 0.74, cloudMassNoise + trail * 0.56);
  float fog = clamp(baseFog * 2.16 + cloudMass * 1.18, 0.0, 1.0);
  // Right-origin light source as a flattened oval that narrows toward center.
  float beamT = clamp((uv.x - 0.35) / 0.65, 0.0, 1.0); // wider reach toward center
  float beamHalfHeight = mix(0.070, 0.230, beamT); // larger overall oval size
  float beamCore = 1.0 - abs((uv.y - 0.52) / max(beamHalfHeight, 0.0001));
  beamCore = clamp(beamCore, 0.0, 1.0);
  beamCore *= beamCore;
  float beamLength = smoothstep(0.30, 0.98, uv.x);
  float sourceOval = beamCore * beamLength;

  // Reintroduce the original cool cast so the fog/liquid reads slightly blue, not flat gray.
  vec3 deep = vec3(0.030, 0.033, 0.040);
  vec3 fogGray = vec3(0.158, 0.168, 0.184);
  vec3 lightGray = vec3(0.782, 0.798, 0.828);

  vec2 mouseP = uMouse * 2.0 - 1.0;
  mouseP.x *= uResolution.x / max(uResolution.y, 1.0);
  float mouseDist = length(p - mouseP);
  float mouseInfluence = exp(-mouseDist * 5.1);
  float mouseSpeed = clamp(length(uMouseVelocity) * 270.0, 0.0, 1.0);
  float mouseFogLift = exp(-mouseDist * 2.9) * (0.66 + 0.90 * mouseSpeed);
  fog = clamp(fog + mouseFogLift * 0.92 + alpha * (0.11 + 0.08 * right), 0.0, 1.0);

  float beam = (0.22 + 0.78 * fog) * right * verticalBand;

  vec3 col = mix(deep, fogGray, fog);
  col *= mix(0.58, 1.0, leftFade);
  col = mix(
    col,
    lightGray,
      0.18 * beam +
      0.18 * rightGlow * verticalBand +
      0.22 * sourceOval +
      0.12 * trail +
      0.16 * mouseInfluence * mouseSpeed
  );

  float textCore = smoothstep(0.12, 0.95, alpha);
  float textVisibility = smoothstep(-0.55, 0.90, p.x);
  vec3 textInk = mix(vec3(0.57), vec3(0.95), 0.25 + 0.75 * right);
  col = mix(col, textInk, textCore * 0.88 * textVisibility);

  // Ocean layer: perspective-compressed swell fields with irregular cresting,
  // tuned to feel like looking down from altitude rather than a flat sliding texture.
  float horizonBase = 0.324;
  float horizonWave = 0.005 * sin(uTime * 0.024 + uv.x * 1.9);
  float horizonNoise = (fbm(vec2(uv.x * 1.1 - uTime * 0.003, 8.0 + uTime * 0.006)) - 0.5) * 0.008;
  float horizon = horizonBase + horizonWave + horizonNoise;

  float oceanMask = 1.0 - smoothstep(horizon - 0.16, horizon + 0.14, uv.y);
  float oceanDepth = clamp((horizon - uv.y) / max(horizon + 0.22, 0.001), 0.0, 1.0);
  float oceanNear = pow(oceanDepth, 1.08);
  float oceanFar = 1.0 - oceanNear;
  float horizonFade = smoothstep(0.05, 0.24, oceanDepth);

  vec2 oceanPerspective = vec2(
    (uv.x - 0.5) * mix(9.2, 7.1, oceanNear),
    oceanDepth * mix(7.4, 4.8, oceanNear)
  );
  vec2 oceanWarp = vec2(
    fbm(vec2(oceanPerspective.x * 0.46 + 11.0, oceanPerspective.y * 0.72 - uTime * 0.010)),
    fbm(vec2(oceanPerspective.x * 0.58 - 7.0, oceanPerspective.y * 0.64 + uTime * 0.008))
  ) - 0.5;
  vec2 warpedOcean = oceanPerspective + oceanWarp * mix(0.18, 0.08, oceanNear);

  float swellA = sin(dot(warpedOcean, normalize(vec2(0.995, -0.08))) * mix(1.34, 0.96, oceanNear) - uTime * 0.17);
  float swellB = sin(dot(warpedOcean, normalize(vec2(0.965, 0.10))) * mix(1.92, 1.28, oceanNear) - uTime * 0.13 + 1.2);
  float swellC = sin(dot(warpedOcean, normalize(vec2(1.0, -0.03))) * mix(2.72, 1.76, oceanNear) - uTime * 0.10 + oceanWarp.x * 1.2);
  float swellField = (swellA * 0.42 + swellB * 0.34 + swellC * 0.24) * horizonFade;

  float chopNoiseA = fbm(vec2(warpedOcean.x * mix(3.6, 2.2, oceanNear) - uTime * 0.030, warpedOcean.y * 3.4));
  float chopNoiseB = fbm(vec2(warpedOcean.x * mix(5.4, 3.1, oceanNear) + uTime * 0.022, warpedOcean.y * 4.4 - 13.0));
  float chopField = chopNoiseA * 0.58 + chopNoiseB * 0.42;
  float crestLengthA = smoothstep(0.30, 0.78, fbm(vec2(warpedOcean.x * 0.42 + 21.0, warpedOcean.y * 1.2 - 4.0)));
  float crestLengthB = smoothstep(0.28, 0.76, fbm(vec2(warpedOcean.x * 0.36 - 13.0, warpedOcean.y * 1.0 + 9.0)));
  float crestLengthC = smoothstep(0.26, 0.74, fbm(vec2(warpedOcean.x * 0.32 + 7.0, warpedOcean.y * 0.9 - 17.0)));
  float crestSegments = max(crestLengthA, max(crestLengthB, crestLengthC));

  float crestTrainA = pow(max(0.0, sin(dot(warpedOcean, normalize(vec2(0.99, -0.05))) * mix(8.0, 5.0, oceanNear) - uTime * 0.34 + chopField * 1.8)), mix(22.0, 12.0, oceanNear));
  float crestTrainB = pow(max(0.0, sin(dot(warpedOcean, normalize(vec2(0.97, 0.08))) * mix(10.6, 6.4, oceanNear) - uTime * 0.26 + 1.7 + oceanWarp.y * 1.2)), mix(28.0, 14.0, oceanNear));
  float crestTrainC = pow(max(0.0, sin(dot(warpedOcean, normalize(vec2(1.0, 0.01))) * mix(13.2, 8.0, oceanNear) - uTime * 0.21 + 0.9)), mix(34.0, 16.0, oceanNear));
  float crestMask = clamp((crestTrainA * 0.44 + crestTrainB * 0.36 + crestTrainC * 0.20) * (0.28 + 0.72 * chopField) * crestSegments * horizonFade, 0.0, 1.0);

  float waveShade = clamp(0.5 + 0.5 * swellField, 0.0, 1.0);
  float troughShade = pow(1.0 - waveShade, 1.35) * (0.18 + 0.46 * oceanNear) * horizonFade;

  vec3 oceanBase = vec3(0.028, 0.033, 0.044);
  vec3 oceanLift = vec3(0.116, 0.128, 0.150);
  vec3 oceanCol = mix(oceanBase, oceanLift, waveShade * (0.42 + 0.58 * oceanNear));
  oceanCol -= vec3(0.016, 0.018, 0.022) * troughShade;

  // Sun/moon glint from the upper-right catches only the sharpest crests.
  float glintTrack = exp(-pow((uv.x - 0.72) * 1.9, 2.0)) * exp(-pow((uv.y - (horizon - 0.03)) * 8.0, 2.0));
  float glintNoise = smoothstep(0.62, 0.94, chopField * 0.6 + crestMask * 0.8) * mix(0.55, 1.0, horizonFade);
  float glint = glintTrack * glintNoise * (0.24 + 0.76 * oceanFar);
  oceanCol += vec3(0.122, 0.128, 0.142) * crestMask * (0.34 + 0.86 * oceanNear);
  oceanCol += vec3(0.156, 0.162, 0.178) * glint * 0.60;

  // Distant fog bank above the ocean, decoupled from mouse interaction.
  float distantFogBand = exp(-pow((uv.y - (horizon + 0.072)) * 10.0, 2.0));
  float distantFogNoiseA = fbm(vec2(uv.x * 1.3 - uTime * 0.006, 19.0 + uv.y * 6.0));
  float distantFogNoiseB = fbm(vec2(uv.x * 2.1 + uTime * 0.004, 31.0 + uv.y * 9.0));
  float distantFogShape = smoothstep(0.34, 0.70, distantFogNoiseA * 0.62 + distantFogNoiseB * 0.38);
  float distantFogMask = distantFogBand * distantFogShape * smoothstep(horizon + 0.16, horizon - 0.01, uv.y);
  vec3 distantFogCol = mix(vec3(0.070, 0.076, 0.090), vec3(0.132, 0.140, 0.158), 0.42 + 0.58 * right);

  float seamMist = exp(-pow((uv.y - (horizon + 0.030)) * 13.0, 2.0));
  col = mix(col, oceanCol, oceanMask * 0.94);
  col = mix(col, distantFogCol, distantFogMask * 0.44);
  col += vec3(0.040, 0.044, 0.052) * seamMist * (0.30 + 0.54 * fog) * (0.34 + 0.52 * right);

  // Subtle monochrome side-lighting.
  float leftGlow = smoothstep(0.75, -0.55, p.x);
  float rightGlowTint = smoothstep(-0.35, 0.90, p.x);
  float textEdge = textCore * 0.22;
  float sideLight =
    (0.010 * leftGlow + 0.018 * leftGlow * textEdge + 0.005 * leftGlow * fog) +
    (0.008 * rightGlowTint + 0.014 * rightGlowTint * textEdge + 0.004 * rightGlowTint * fog);
  col += vec3(sideLight);

  // Gentle contrast lift: brighter source, slightly deeper shadows.
  col = pow(clamp(col, 0.0, 1.0), vec3(1.28));
  col *= 1.464;

  // Analog-like film grain plus a faint TV-static pass.
  // Uses time-quantized frame seeds to avoid directional drift artifacts.
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

function drawMask(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const minEdge = Math.min(width, height);
  // The shader mask controls the perceived title size more than the CSS <h1>.
  // Keep this in sync with hero typography sizing.
  const fontSize = Math.max(52, Math.floor(minEdge * 0.20));

  ctx.clearRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;

  const x = width * 0.5;
  const y = height * 0.52;

  ctx.fillStyle = "rgba(255,255,255,1)";
  const ghost = "GHOST";
  const signal = "Signal";

  // Keep "GHOST" at current weight and make "Signal" slightly thinner.
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  const ghostWidth = ctx.measureText(ghost).width;

  ctx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`;
  const signalWidth = ctx.measureText(signal).width;

  const startX = x - (ghostWidth + signalWidth) * 0.5;

  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillText(ghost, startX + ghostWidth * 0.5, y);

  ctx.font = `400 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillText(signal, startX + ghostWidth + signalWidth * 0.5, y);
}

export function GhostSignalLiquidWordmark() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl2", { alpha: false, antialias: true }) ||
      canvas.getContext("webgl", { alpha: false, antialias: true })) as WebGLRenderingContext | null;

    if (!gl) return;

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
      mask: gl.getUniformLocation(updateProgram, "uMaskTexture"),
      mouse: gl.getUniformLocation(updateProgram, "uMouse"),
      mouseVelocity: gl.getUniformLocation(updateProgram, "uMouseVelocity"),
    };

    const renderUniforms = {
      time: gl.getUniformLocation(renderProgram, "uTime"),
      resolution: gl.getUniformLocation(renderProgram, "uResolution"),
      texel: gl.getUniformLocation(renderProgram, "uTexel"),
      trail: gl.getUniformLocation(renderProgram, "uTrailTexture"),
      mask: gl.getUniformLocation(renderProgram, "uMaskTexture"),
      mouse: gl.getUniformLocation(renderProgram, "uMouse"),
      mouseVelocity: gl.getUniformLocation(renderProgram, "uMouseVelocity"),
    };

    const maskCanvas = document.createElement("canvas");
    const maskTexture = gl.createTexture();
    if (!maskTexture) return;

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

      maskCanvas.width = width;
      maskCanvas.height = height;
      drawMask(maskCanvas);

      gl.viewport(0, 0, width, height);

      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);

      allocateTrail(width, height);
    };

    resize();

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = (event.clientX - rect.left) / rect.width;
      // WebGL UV origin is bottom-left; DOM pointer origin is top-left.
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

      // Let the fog trail lag behind the pointer slightly so the interaction feels heavier.
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

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.uniform1i(updateUniforms.mask, 1);

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

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.uniform1i(renderUniforms.mask, 1);

      gl.uniform1f(renderUniforms.time, time);
      gl.uniform2f(renderUniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(renderUniforms.texel, texelX, texelY);
      gl.uniform2f(renderUniforms.mouse, mouseInertia.x, mouseInertia.y);
      gl.uniform2f(renderUniforms.mouseVelocity, mouseVelocity.x, mouseVelocity.y);

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
      gl.deleteTexture(maskTexture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(updateProgram);
      gl.deleteProgram(renderProgram);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
}
