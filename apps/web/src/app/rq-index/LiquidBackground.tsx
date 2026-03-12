"use client";

import { useEffect, useRef } from "react";

/**
 * Liquid Background Animation for RQ Index
 * Based on GhostSignalLiquidWordmark but without text mask
 * Pure liquid fog animation for background use
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

// High-quality hash function
vec3 hash3(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
  p3 += dot(p3, p3.yxz + 19.19);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

// Smooth value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  // Quintic interpolation for smoother results
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float a = hash3(i).x;
  float b = hash3(i + vec2(1.0, 0.0)).x;
  float c = hash3(i + vec2(0.0, 1.0)).x;
  float d = hash3(i + vec2(1.0, 1.0)).x;

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Multi-octave fractal Brownian motion - more octaves for smoother fog
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);

  for (int i = 0; i < 8; i++) {
    value += amplitude * noise(p * frequency);
    p = rot * p * 2.0 + vec2(0.5);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Curl noise for fluid-like flow
vec2 curlNoise(vec2 p, float t) {
  float eps = 0.1;
  float n1 = fbm(p + vec2(0.0, eps) + vec2(t * 0.02, t * 0.015));
  float n2 = fbm(p - vec2(0.0, eps) + vec2(t * 0.02, t * 0.015));
  float n3 = fbm(p + vec2(eps, 0.0) + vec2(t * 0.018, -t * 0.012));
  float n4 = fbm(p - vec2(eps, 0.0) + vec2(t * 0.018, -t * 0.012));

  return vec2((n1 - n2) / (2.0 * eps), (n4 - n3) / (2.0 * eps));
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  // Multi-scale noise for organic fog movement
  vec2 curl = curlNoise(p * 0.8, uTime);
  float turbulence1 = fbm(p * 1.2 + uTime * 0.03 + curl * 0.3);
  float turbulence2 = fbm(p * 2.4 - uTime * 0.02 + curl * 0.2);
  float turbulence3 = fbm(p * 4.8 + uTime * 0.015);

  // Combine multiple scales for depth
  float combined = turbulence1 * 0.5 + turbulence2 * 0.3 + turbulence3 * 0.2;

  // Slow upward drift like classic London fog
  vec2 flow = vec2(0.0, -0.0012); // Negative = upward in screen space

  // Add subtle horizontal drift for atmospheric effect
  flow.x += sin(uTime * 0.02 + p.y * 2.0) * 0.0003;

  // Fog generation at the bottom of screen
  // In UV space: vUv.y = 0 is top, vUv.y = 1 is bottom
  // We want MORE fog at bottom (high vUv.y values)
  float distanceFromBottom = 1.0 - vUv.y; // 0 at bottom, 1 at top
  float bottomGradient = smoothstep(0.7, 0.0, distanceFromBottom); // Dense at bottom

  // Add some variation to the fog generation
  float fogVariation = 0.7 + 0.3 * sin(uTime * 0.03 + p.x * 3.0);

  // Generate dense fog from the bottom
  float fogSource = bottomGradient * fogVariation * 0.015;

  // Mouse interaction - subtle but visible and localized
  vec2 mouseP = uMouse * 2.0 - 1.0;
  mouseP.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 mouseDelta = p - mouseP;
  float mouseDist = length(mouseDelta);
  float mouseInfluence = exp(-mouseDist * 8.0); // Localized but visible area
  float mouseSpeed = clamp(length(uMouseVelocity) * 120.0, 0.0, 1.0);

  // Gentle atmospheric disturbance
  vec2 mouseDrift = normalize(mouseDelta) * 0.003 * mouseSpeed;
  flow += mouseDrift * mouseInfluence;

  // Subtle fog creation - visible on hover
  float mouseInject = mouseInfluence * 0.004; // Subtle presence
  mouseInject += mouseInfluence * mouseSpeed * 0.008; // Extra on movement

  // Multi-sample for smoother advection
  vec2 sampleUv1 = uv + flow;
  vec2 sampleUv2 = uv + flow * 0.8;
  vec2 sampleUv3 = uv + flow * 0.6;

  float prev1 = texture2D(uPrevTrail, sampleUv1).r;
  float prev2 = texture2D(uPrevTrail, sampleUv2).r;
  float prev3 = texture2D(uPrevTrail, sampleUv3).r;

  float prevSmooth = (prev1 * 0.5 + prev2 * 0.3 + prev3 * 0.2);

  // Very slow decay - dense fog lingers
  float decay = 0.9985;
  float val = prevSmooth * decay + fogSource + mouseInject;

  // Clamp to prevent over-saturation
  val = clamp(val, 0.0, 1.2);

  gl_FragColor = vec4(val, val, val, 1.0);
}
`;

const RENDER_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D uTrail;
uniform vec2 uTexel;
uniform float uTime;

// Hash for star field generation
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Generate star field
float stars(vec2 uv, float time) {
  // Scale UV to create star grid
  vec2 starUv = uv * 200.0;
  vec2 starId = floor(starUv);
  vec2 starLocal = fract(starUv);

  float brightness = 0.0;

  // Check 3x3 grid for stars
  for (float y = -1.0; y <= 1.0; y += 1.0) {
    for (float x = -1.0; x <= 1.0; x += 1.0) {
      vec2 offset = vec2(x, y);
      vec2 cellId = starId + offset;

      // Random position within cell
      float starRandom = hash(cellId);

      // Only some cells have stars
      if (starRandom > 0.95) {
        vec2 starPos = offset + vec2(hash(cellId + vec2(1.0, 0.0)), hash(cellId + vec2(0.0, 1.0)));
        vec2 toStar = starLocal - starPos;
        float dist = length(toStar);

        // Very small star size (single pixel)
        float starSize = 0.02 + hash(cellId + vec2(2.0, 3.0)) * 0.01;

        if (dist < starSize) {
          // Slow twinkle effect
          float twinkleSpeed = 0.5 + hash(cellId + vec2(4.0, 5.0)) * 1.5;
          float twinkle = 0.3 + 0.7 * (0.5 + 0.5 * sin(time * twinkleSpeed + starRandom * 6.28));

          // Brighter in center, fade at edges
          float star = (1.0 - smoothstep(0.0, starSize, dist)) * twinkle;
          brightness += star;
        }
      }
    }
  }

  return clamp(brightness, 0.0, 1.0);
}

void main() {
  float val = 0.0;

  // Larger, more diffuse blur for soft mist-like appearance
  float totalWeight = 0.0;
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      float dist = length(vec2(x, y));
      // Gaussian-like falloff for natural diffusion
      float weight = exp(-dist * 0.5);
      val += texture2D(uTrail, vUv + vec2(x, y) * uTexel * 3.0).r * weight;
      totalWeight += weight;
    }
  }
  val /= totalWeight;

  // Star field in upper portion of screen
  float starFade = smoothstep(0.3, 0.0, vUv.y);
  float starField = stars(vUv, uTime * 0.2) * starFade;

  // Star color (dim white/cyan)
  vec3 starColor = vec3(0.7, 0.85, 0.95) * starField * 0.4;

  // Dark, moody fog color - London street atmosphere
  vec3 fogColorDark = vec3(0.25, 0.30, 0.35); // Dark blue-grey fog
  vec3 fogColorLight = vec3(0.55, 0.65, 0.75); // Lighter fog where thinner

  // Brightness based on density - darker where denser
  float brightness = 0.4 + 0.6 * pow(1.0 - val, 0.8);
  vec3 mistColor = mix(fogColorDark, fogColorLight, brightness);

  vec3 col = mistColor;

  // Strong, dense alpha for thick London fog
  float alpha = pow(val, 0.9) * 1.2;
  alpha = smoothstep(0.0, 0.15, alpha);
  alpha = clamp(alpha, 0.0, 0.95); // Dense but not fully opaque

  // Composite: stars behind fog
  vec3 finalColor = starColor + col * alpha;

  gl_FragColor = vec4(finalColor, max(starField * 0.4, alpha));
}
`;

export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    });

    if (!gl) {
      console.warn("WebGL not supported");
      return;
    }

    // Higher resolution for smoother fog
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    let lastCanvasWidth = 0;
    let lastCanvasHeight = 0;

    // Declare trail textures and FBOs before resize function
    let trailTextures: WebGLTexture[] = [];
    let trailFbos: WebGLFramebuffer[] = [];
    let currentTrailIndex = 0;

    function resize() {
      if (!canvas || !gl) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      // Use higher base resolution for smoother fog
      const scale = 1.2;
      const newWidth = Math.floor(width * dpr * scale);
      const newHeight = Math.floor(height * dpr * scale);

      canvas.width = newWidth;
      canvas.height = newHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Only recreate trail targets if size changed and textures exist
      if ((newWidth !== lastCanvasWidth || newHeight !== lastCanvasHeight) && trailTextures.length > 0) {
        createTrailTargets();
        lastCanvasWidth = newWidth;
        lastCanvasHeight = newHeight;
      }
    }

    function compileShader(type: number, source: string): WebGLShader | null {
      if (!gl) return null;
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

    function createProgram(vs: string, fs: string) {
      if (!gl) return null;
      const vertexShader = compileShader(gl.VERTEX_SHADER, vs);
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fs);
      if (!vertexShader || !fragmentShader) return null;

      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
      }

      return program;
    }

    const updateProgram = createProgram(VERTEX_SHADER, UPDATE_FRAGMENT_SHADER);
    const renderProgram = createProgram(VERTEX_SHADER, RENDER_FRAGMENT_SHADER);
    if (!updateProgram || !renderProgram) return;

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    function createTrailTargets() {
      if (!gl || !canvas) return;
      trailTextures.forEach((t) => gl.deleteTexture(t));
      trailFbos.forEach((f) => gl.deleteFramebuffer(f));
      trailTextures = [];
      trailFbos = [];

      // Create initial fog data
      const size = canvas.width * canvas.height * 4;
      const initialData = new Uint8Array(size);
      for (let i = 0; i < size; i += 4) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);
        const nx = (x / canvas.width) * 2 - 1;
        const ny = (y / canvas.height) * 2 - 1;

        // Create dense fog at bottom, lighter at top - London street scene
        const distanceFromBottom = 1.0 - (y / canvas.height); // 0 at bottom, 1 at top
        const bottomFog = Math.max(0, 1.0 - distanceFromBottom * 1.5); // Dense at bottom
        const centerDist = Math.abs(nx) * 0.5; // Side to center
        const fog = bottomFog * (1.0 - centerDist) * 0.45; // 45% opacity at bottom

        const value = Math.floor(fog * 255);
        initialData[i] = value;     // R
        initialData[i + 1] = value; // G
        initialData[i + 2] = value; // B
        initialData[i + 3] = 255;   // A
      }

      for (let i = 0; i < 2; i++) {
        const tex = gl.createTexture();
        if (!tex) continue;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // Initialize with fog data instead of null
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer();
        if (!fbo) continue;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        trailTextures.push(tex);
        trailFbos.push(fbo);
      }

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    resize();
    window.addEventListener("resize", resize);
    createTrailTargets();

    const mouse = { x: 0.5, y: 0.5 };
    const mousePrev = { x: 0.5, y: 0.5 };
    const mouseVelocity = { x: 0, y: 0 };

    function onMouseMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePrev.x = mouse.x;
      mousePrev.y = mouse.y;
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
      mouseVelocity.x = mouse.x - mousePrev.x;
      mouseVelocity.y = mouse.y - mousePrev.y;
    }

    window.addEventListener("mousemove", onMouseMove);

    let startTime = performance.now();
    let rafId: number;

    function render(now: number) {
      if (!gl || !canvas) return;
      const time = (now - startTime) * 0.001;

      const prevIndex = currentTrailIndex;
      const nextIndex = 1 - currentTrailIndex;

      // Update trail
      gl.useProgram(updateProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, trailFbos[nextIndex]);
      gl.viewport(0, 0, canvas.width, canvas.height);

      const aPos = gl.getAttribLocation(updateProgram!, "aPosition");
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(gl.getUniformLocation(updateProgram!, "uTime"), time);
      gl.uniform2f(gl.getUniformLocation(updateProgram!, "uResolution"), canvas.width, canvas.height);
      gl.uniform2f(gl.getUniformLocation(updateProgram!, "uTexel"), 1.0 / canvas.width, 1.0 / canvas.height);
      gl.uniform2f(gl.getUniformLocation(updateProgram!, "uMouse"), mouse.x, mouse.y);
      gl.uniform2f(gl.getUniformLocation(updateProgram!, "uMouseVelocity"), mouseVelocity.x, mouseVelocity.y);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, trailTextures[prevIndex]);
      gl.uniform1i(gl.getUniformLocation(updateProgram!, "uPrevTrail"), 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      mouseVelocity.x *= 0.85;
      mouseVelocity.y *= 0.85;

      currentTrailIndex = nextIndex;

      // Render to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(renderProgram);

      const aPosRender = gl.getAttribLocation(renderProgram!, "aPosition");
      gl.enableVertexAttribArray(aPosRender);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(aPosRender, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(gl.getUniformLocation(renderProgram!, "uTime"), time);
      gl.uniform2f(gl.getUniformLocation(renderProgram!, "uTexel"), 1.0 / canvas.width, 1.0 / canvas.height);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, trailTextures[nextIndex]);
      gl.uniform1i(gl.getUniformLocation(renderProgram!, "uTrail"), 0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafId);
      if (gl) {
        trailTextures.forEach((t) => gl.deleteTexture(t));
        trailFbos.forEach((f) => gl.deleteFramebuffer(f));
        gl.deleteBuffer(buffer);
        gl.deleteProgram(updateProgram);
        gl.deleteProgram(renderProgram);
      }
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
