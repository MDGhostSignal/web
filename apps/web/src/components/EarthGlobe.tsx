"use client";

import { useEffect, useRef } from "react";

/**
 * EarthGlobe - A lightweight WebGL spinning Earth with atmosphere
 *
 * Features:
 * - Real Earth texture with accurate continents
 * - Monochromatic color scheme
 * - Slow rotation with atmosphere at different speed
 * - Optimized for mobile (low-power GPU hints, frame throttling)
 * - Respects prefers-reduced-motion
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
uniform sampler2D uEarthTexture;
uniform float uTextureLoaded;
uniform float uRotationX;
uniform float uRotationY;

#define PI 3.14159265359

// Simple hash for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Ray-sphere intersection
float sphereIntersect(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return -1.0;
  return -b - sqrt(h);
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;

  // Rotation from uniforms (combines auto-rotation and mouse interaction)
  float earthRotation = uRotationX;
  float earthTilt = uRotationY * 0.5; // Vertical tilt from mouse

  // Camera setup - looking at Earth from a distance
  vec3 ro = vec3(0.0, 0.0, 2.8);
  vec3 rd = normalize(vec3(p, -1.5));

  // Earth sphere
  float earthRadius = 1.0;
  float atmoRadius = 1.12;

  // Background - deep space black
  vec3 col = vec3(0.01, 0.012, 0.018);

  // Atmosphere glow (outer layer)
  float atmoT = sphereIntersect(ro, rd, atmoRadius);
  if (atmoT > 0.0) {
    vec3 atmoPos = ro + rd * atmoT;
    vec3 atmoNormal = normalize(atmoPos);

    // Fresnel-like atmospheric glow
    float fresnel = 1.0 - abs(dot(rd, atmoNormal));
    fresnel = pow(fresnel, 2.5);

    // Subtle atmosphere color (monochromatic cool tone)
    vec3 atmoColor = vec3(0.3, 0.35, 0.45);
    col += atmoColor * fresnel * 0.5;
  }

  // Earth surface
  float t = sphereIntersect(ro, rd, earthRadius);
  if (t > 0.0) {
    vec3 pos = ro + rd * t;
    vec3 normal = normalize(pos);

    // Apply vertical tilt rotation around X axis
    float cosT = cos(earthTilt);
    float sinT = sin(earthTilt);
    vec3 tiltedNormal = vec3(
      normal.x,
      normal.y * cosT - normal.z * sinT,
      normal.y * sinT + normal.z * cosT
    );

    // Convert 3D position to longitude/latitude
    float lon = atan(tiltedNormal.x, tiltedNormal.z) + earthRotation;
    float lat = asin(clamp(tiltedNormal.y, -1.0, 1.0));

    // Convert to texture UV coordinates (equirectangular projection)
    // Note: texture Y is flipped (0 = north pole, 1 = south pole)
    vec2 texUv = vec2(
      0.5 + lon / (2.0 * PI),
      0.5 - lat / PI
    );
    texUv.x = fract(texUv.x); // Wrap longitude

    // Sample the Earth texture (topology/heightmap)
    float height = 0.0;
    if (uTextureLoaded > 0.5) {
      // Sample texture - it's a heightmap (dark=ocean, light=land/mountains)
      height = texture2D(uEarthTexture, texUv).r;
    }

    // Determine land vs ocean based on height threshold
    // Ocean is typically below ~0.05-0.1 in heightmaps
    float isLand = smoothstep(0.03, 0.08, height);

    // Lighting from upper right
    vec3 lightDir = normalize(vec3(0.5, 0.3, 0.8));
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.15;
    float lighting = ambient + diff * 0.85;

    // Terminator softness (day/night transition)
    float terminator = smoothstep(-0.15, 0.25, dot(normal, lightDir));
    lighting *= 0.3 + 0.7 * terminator;

    // Monochromatic palette - cool grays
    vec3 oceanDeep = vec3(0.04, 0.05, 0.07);
    vec3 oceanShallow = vec3(0.08, 0.10, 0.13);
    vec3 landLow = vec3(0.22, 0.24, 0.27);
    vec3 landMid = vec3(0.32, 0.35, 0.38);
    vec3 landHigh = vec3(0.50, 0.53, 0.56);

    // Ocean depth variation
    float oceanDepth = 1.0 - height / 0.08;
    vec3 oceanColor = mix(oceanShallow, oceanDeep, clamp(oceanDepth, 0.0, 1.0));

    // Land elevation variation
    float landElev = smoothstep(0.08, 0.6, height);
    vec3 landColor = mix(landLow, landMid, landElev);
    landColor = mix(landColor, landHigh, smoothstep(0.4, 0.9, height));

    // Combine ocean and land
    vec3 surfaceColor = mix(oceanColor, landColor, isLand);

    // Apply lighting
    surfaceColor *= lighting;

    // Subtle specular on ocean
    vec3 halfVec = normalize(lightDir - rd);
    float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);
    surfaceColor += vec3(0.25) * spec * (1.0 - isLand) * terminator;

    // Atmospheric scattering at edges (limb effect)
    float limb = 1.0 - abs(dot(rd, normal));
    limb = pow(limb, 2.0);
    vec3 limbColor = vec3(0.15, 0.18, 0.24);
    surfaceColor = mix(surfaceColor, limbColor, limb * 0.6);

    // Inner atmosphere glow
    surfaceColor += vec3(0.06, 0.08, 0.12) * limb * terminator;

    col = surfaceColor;
  }

  // Subtle vignette
  float vignette = 1.0 - length(p) * 0.25;
  col *= vignette;

  // Very subtle grain
  float grain = (hash(gl_FragCoord.xy + uTime * 0.1) - 0.5) * 0.015;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
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
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

type EarthGlobeProps = {
  className?: string;
};

export function EarthGlobe({ className = "" }: EarthGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Get WebGL context with low-power preference for mobile
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;

    if (!gl) {
      console.warn("WebGL not supported");
      return;
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) return;

    // Create fullscreen quad
    const quad = gl.createBuffer();
    if (!quad) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "aPosition");
    const timeLoc = gl.getUniformLocation(program, "uTime");
    const resLoc = gl.getUniformLocation(program, "uResolution");
    const texLoc = gl.getUniformLocation(program, "uEarthTexture");
    const texLoadedLoc = gl.getUniformLocation(program, "uTextureLoaded");
    const rotXLoc = gl.getUniformLocation(program, "uRotationX");
    const rotYLoc = gl.getUniformLocation(program, "uRotationY");

    // Mouse interaction state
    const rotation = { x: 0, y: 0 };
    const velocity = { x: 0, y: 0 };
    const mouse = { down: false, lastX: 0, lastY: 0 };
    const autoRotationSpeed = 0.02;
    const friction = 0.95;
    const sensitivity = 0.005;

    // Create and load Earth texture
    const earthTexture = gl.createTexture();
    let textureLoaded = false;

    const loadTexture = () => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, earthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        // Use LINEAR filtering for smooth appearance
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        textureLoaded = true;
      };

      img.onerror = () => {
        console.warn("Failed to load Earth texture, using fallback");
        // Create a simple fallback texture with basic continent shapes
        createFallbackTexture();
      };

      // NASA Blue Marble Earth texture (public domain) - grayscale version
      // This is a monochrome equirectangular projection of Earth
      img.src = "/images/globe/earth-topology.png";
    };

    const createFallbackTexture = () => {
      // Create a simple procedural fallback
      const size = 256;
      const data = new Uint8Array(size * size * 4);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          // Simple latitude-based pattern as fallback
          const lat = (y / size - 0.5) * Math.PI;
          const lon = (x / size) * Math.PI * 2;

          // Very rough continent approximation
          let land = 0;

          // North America (rough)
          if (lon > 3.5 && lon < 5.5 && lat > 0.3 && lat < 1.2) land = 1;
          // South America (rough)
          if (lon > 4.2 && lon < 5.2 && lat > -1.0 && lat < 0.2) land = 1;
          // Europe/Africa (rough)
          if (lon > 5.8 || lon < 0.8) {
            if (lat > -0.6 && lat < 1.2) land = 1;
          }
          // Asia (rough)
          if (lon > 0.8 && lon < 3.0 && lat > 0.0 && lat < 1.3) land = 1;
          // Australia (rough)
          if (lon > 1.8 && lon < 2.8 && lat > -0.8 && lat < -0.2) land = 1;

          const val = land ? 200 : 40;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
      }

      gl.bindTexture(gl.TEXTURE_2D, earthTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      textureLoaded = true;
    };

    loadTexture();

    // Mouse/touch event handlers
    const onPointerDown = (e: PointerEvent) => {
      mouse.down = true;
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!mouse.down) return;

      const deltaX = e.clientX - mouse.lastX;
      const deltaY = e.clientY - mouse.lastY;

      velocity.x = deltaX * sensitivity;
      velocity.y = -deltaY * sensitivity; // Inverted for natural feel

      rotation.x += velocity.x;
      rotation.y += velocity.y;

      // Clamp vertical rotation to avoid flipping
      rotation.y = Math.max(-1.2, Math.min(1.2, rotation.y));

      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;
    };

    const onPointerUp = () => {
      mouse.down = false;
      canvas.style.cursor = "grab";
    };

    const onPointerLeave = () => {
      mouse.down = false;
      canvas.style.cursor = "grab";
    };

    // Add event listeners
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.style.cursor = "grab";

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    resize();

    let lastTime = 0;
    const targetFps = 30; // Cap at 30fps for performance
    const frameInterval = 1000 / targetFps;

    const start = performance.now();

    const render = (now: number) => {
      // Frame rate limiting
      const delta = now - lastTime;
      if (delta < frameInterval) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      lastTime = now - (delta % frameInterval);

      resize();

      const time = prefersReducedMotion ? 0 : (now - start) * 0.001;

      // Apply friction to velocity when not dragging
      if (!mouse.down) {
        velocity.x *= friction;
        velocity.y *= friction;

        // Apply remaining velocity
        rotation.x += velocity.x;
        rotation.y += velocity.y;

        // Add auto-rotation when velocity is low
        if (Math.abs(velocity.x) < 0.001) {
          rotation.x += autoRotationSpeed * (delta / 1000);
        }

        // Clamp vertical rotation
        rotation.y = Math.max(-1.2, Math.min(1.2, rotation.y));
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Bind Earth texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, earthTexture);
      gl.uniform1i(texLoc, 0);
      gl.uniform1f(texLoadedLoc, textureLoaded ? 1.0 : 0.0);

      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(rotXLoc, rotation.x);
      gl.uniform1f(rotYLoc, rotation.y);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(quad);
      gl.deleteTexture(earthTexture);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      aria-label="Rotating Earth globe visualization"
      role="img"
    />
  );
}
