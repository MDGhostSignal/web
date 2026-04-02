"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollScenes - Earth Globe animation with scroll-driven interaction
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
uniform float uScroll;
uniform sampler2D uEarthTexture;
uniform float uTextureLoaded;
uniform float uRotationX;
uniform float uRotationY;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float sphereIntersect(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return -1.0;
  return -b - sqrt(h);
}

// Fast city light - single sharp point with early culling
float cityLight(vec2 pos, vec2 city, float size) {
  vec2 d = pos - city;
  float dist2 = d.x * d.x + d.y * d.y; // Squared distance (no sqrt)
  float r2 = size * size;
  return dist2 < r2 ? 1.0 : 0.0; // Sharp cutoff, no gradient
}

// City lights - optimized with early culling
float cityLights(float lat, float lon) {
  vec2 p = vec2(lat, lon);
  float light = 0.0;
  float s = 0.012; // Light point size

  // Early culling by region (skip distant cities entirely)
  // Europe (lat 0.7-1.0, lon -0.1-0.7)
  if (lat > 0.6 && lat < 1.1 && lon > -0.2 && lon < 0.8) {
    light += cityLight(p, vec2(0.899, -0.002), s);  // London
    light += cityLight(p, vec2(0.854, 0.041), s);   // Paris
    light += cityLight(p, vec2(0.916, 0.234), s);   // Berlin
    light += cityLight(p, vec2(0.974, 0.656), s);   // Moscow
    light += cityLight(p, vec2(0.706, -0.064), s);  // Madrid
  }

  // Africa (lat -0.5-0.6, lon 0.0-0.7)
  if (lat > -0.6 && lat < 0.6 && lon > -0.1 && lon < 0.8) {
    light += cityLight(p, vec2(0.113, 0.059), s);   // Lagos
    light += cityLight(p, vec2(0.524, 0.545), s);   // Cairo
    light += cityLight(p, vec2(-0.457, 0.489), s);  // Johannesburg
    light += cityLight(p, vec2(-0.022, 0.643), s);  // Nairobi
    light += cityLight(p, vec2(-0.076, 0.268), s);  // Kinshasa
  }

  // Americas (lon -2.2 to -0.7)
  if (lon > -2.3 && lon < -0.6) {
    light += cityLight(p, vec2(0.711, -1.291), s);  // New York
    light += cityLight(p, vec2(0.595, -2.063), s);  // Los Angeles
    light += cityLight(p, vec2(-0.410, -0.813), s); // São Paulo
  }

  // Asia (lon 0.9-2.7)
  if (lon > 0.8 && lon < 2.8) {
    light += cityLight(p, vec2(0.623, 2.438), s);   // Tokyo
    light += cityLight(p, vec2(0.696, 2.032), s);   // Beijing
    light += cityLight(p, vec2(0.333, 1.272), s);   // Mumbai
    light += cityLight(p, vec2(0.440, 0.965), s);   // Dubai
    light += cityLight(p, vec2(0.023, 1.812), s);   // Singapore
    light += cityLight(p, vec2(0.388, 1.992), s);   // Hong Kong
    light += cityLight(p, vec2(-0.592, 2.639), s);  // Sydney
  }

  return light;
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;

  float earthRotation = uRotationX;
  float earthTilt = uRotationY * 0.5;

  vec3 ro = vec3(0.0, 0.0, 2.8);
  vec3 rd = normalize(vec3(p, -1.5));

  float earthRadius = 1.0;
  float atmoRadius = 1.12;

  // Dark space background
  vec3 col = vec3(0.01, 0.012, 0.018);

  // Atmosphere glow
  float atmoT = sphereIntersect(ro, rd, atmoRadius);
  if (atmoT > 0.0) {
    vec3 atmoPos = ro + rd * atmoT;
    vec3 atmoNormal = normalize(atmoPos);
    float fresnel = 1.0 - abs(dot(rd, atmoNormal));
    fresnel = pow(fresnel, 2.5);
    vec3 atmoColor = vec3(0.3, 0.35, 0.45);
    col += atmoColor * fresnel * 0.5;
  }

  // Earth surface
  float t = sphereIntersect(ro, rd, earthRadius);
  if (t > 0.0) {
    vec3 pos = ro + rd * t;
    vec3 normal = normalize(pos);

    float cosT = cos(earthTilt);
    float sinT = sin(earthTilt);
    vec3 tiltedNormal = vec3(
      normal.x,
      normal.y * cosT - normal.z * sinT,
      normal.y * sinT + normal.z * cosT
    );

    float lon = atan(tiltedNormal.x, tiltedNormal.z) + earthRotation;
    float lat = asin(clamp(tiltedNormal.y, -1.0, 1.0));

    vec2 texUv = vec2(
      0.5 + lon / (2.0 * PI),
      0.5 - lat / PI
    );
    texUv.x = fract(texUv.x);

    float height = 0.0;
    if (uTextureLoaded > 0.5) {
      height = texture2D(uEarthTexture, texUv).r;
    }

    float isLand = smoothstep(0.03, 0.08, height);

    vec3 lightDir = normalize(vec3(0.5, 0.3, 0.8));
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.15;
    float lighting = ambient + diff * 0.85;

    float terminator = smoothstep(-0.15, 0.25, dot(normal, lightDir));
    lighting *= 0.3 + 0.7 * terminator;

    vec3 oceanDeep = vec3(0.04, 0.05, 0.07);
    vec3 oceanShallow = vec3(0.08, 0.10, 0.13);
    vec3 landLow = vec3(0.22, 0.24, 0.27);
    vec3 landMid = vec3(0.32, 0.35, 0.38);
    vec3 landHigh = vec3(0.50, 0.53, 0.56);

    float oceanDepth = 1.0 - height / 0.08;
    vec3 oceanColor = mix(oceanShallow, oceanDeep, clamp(oceanDepth, 0.0, 1.0));

    float landElev = smoothstep(0.08, 0.6, height);
    vec3 landColor = mix(landLow, landMid, landElev);
    landColor = mix(landColor, landHigh, smoothstep(0.4, 0.9, height));

    vec3 surfaceColor = mix(oceanColor, landColor, isLand);
    surfaceColor *= lighting;

    vec3 halfVec = normalize(lightDir - rd);
    float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);
    surfaceColor += vec3(0.25) * spec * (1.0 - isLand) * terminator;

    // City lights - sharp white points, brighter on dark side
    float cityGlow = cityLights(lat, lon);
    float nightFactor = 1.0 - terminator;
    float cityIntensity = cityGlow * (nightFactor * 0.7 + 0.3);
    surfaceColor += vec3(1.0) * cityIntensity * 0.8;

    float limb = 1.0 - abs(dot(rd, normal));
    limb = pow(limb, 2.0);
    vec3 limbColor = vec3(0.15, 0.18, 0.24);
    surfaceColor = mix(surfaceColor, limbColor, limb * 0.6);
    surfaceColor += vec3(0.06, 0.08, 0.12) * limb * terminator;

    col = surfaceColor;
  }

  // Subtle vignette
  float vignette = 1.0 - length((vUv - 0.5) * 1.2) * 0.25;
  col *= vignette;

  // Film grain
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

type ScrollScenesProps = {
  className?: string;
};

export function ScrollScenes({ className = "" }: ScrollScenesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const scrollRef = useRef<number>(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;

    if (!gl) {
      console.warn("WebGL not supported");
      return;
    }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) {
      console.error("Failed to create WebGL program");
      return;
    }

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
    const scrollLoc = gl.getUniformLocation(program, "uScroll");
    const texLoc = gl.getUniformLocation(program, "uEarthTexture");
    const texLoadedLoc = gl.getUniformLocation(program, "uTextureLoaded");
    const rotXLoc = gl.getUniformLocation(program, "uRotationX");
    const rotYLoc = gl.getUniformLocation(program, "uRotationY");

    // Mouse interaction state
    // Initial rotation centered on Europe (lon ~15°E, tilt to show northern hemisphere)
    const rotation = { x: -0.25, y: 0.35 };
    const velocity = { x: 0, y: 0 };
    const mouse = { down: false, lastX: 0, lastY: 0 };
    const autoRotationSpeed = 0.02;
    const friction = 0.95;
    const sensitivity = 0.005;

    // Load Earth texture
    const earthTexture = gl.createTexture();
    let textureLoaded = false;

    const loadTexture = () => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, earthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        textureLoaded = true;
      };

      img.onerror = () => {
        console.warn("Failed to load Earth texture");
        textureLoaded = false;
      };

      img.src = "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png";
    };

    loadTexture();

    // Scroll tracking
    const updateScroll = () => {
      const rect = container.getBoundingClientRect();
      const scrollHeight = container.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      scrollRef.current = Math.max(0, Math.min(1, scrolled / scrollHeight));
    };

    // Mouse events for Earth interaction
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
      velocity.y = -deltaY * sensitivity;

      rotation.x += velocity.x;
      rotation.y += velocity.y;
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
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", updateScroll, { passive: true });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    resize();
    updateScroll();

    let lastTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;
    const start = performance.now();

    const render = (now: number) => {
      const delta = now - lastTime;
      if (delta < frameInterval) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      lastTime = now - (delta % frameInterval);

      resize();
      updateScroll();

      const time = prefersReducedMotion ? 0 : (now - start) * 0.001;

      // Update rotation
      if (!mouse.down) {
        velocity.x *= friction;
        velocity.y *= friction;
        rotation.x += velocity.x;
        rotation.y += velocity.y;

        if (Math.abs(velocity.x) < 0.001) {
          rotation.x += autoRotationSpeed * (delta / 1000);
        }
        rotation.y = Math.max(-1.2, Math.min(1.2, rotation.y));
      }

      gl.clearColor(0.01, 0.012, 0.018, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, earthTexture);
      gl.uniform1i(texLoc, 0);
      gl.uniform1f(texLoadedLoc, textureLoaded ? 1.0 : 0.0);

      gl.uniform1f(timeLoc, time);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(scrollLoc, scrollRef.current);
      gl.uniform1f(rotXLoc, rotation.x);
      gl.uniform1f(rotYLoc, rotation.y);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateScroll);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(quad);
      gl.deleteTexture(earthTexture);
      gl.deleteProgram(program);
    };
  }, [isClient]);

  if (!isClient) {
    return <div className={className} style={{ height: "100vh", background: "#0a0a0d" }} />;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: "100vh", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: "grab",
        }}
        aria-label="Interactive 3D Earth globe"
        role="img"
      />
    </div>
  );
}
