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
uniform sampler2D uCloudTexture;
uniform float uTextureLoaded;
uniform float uCloudLoaded;
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

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;

  float earthRotation = uRotationX;
  float earthTilt = uRotationY * 0.5;
  // Clouds rotate in opposite direction, slower
  float cloudRotation = -uRotationX * 0.3 + uTime * 0.015;

  vec3 ro = vec3(0.0, 0.0, 2.8);
  vec3 rd = normalize(vec3(p, -1.5));

  float earthRadius = 1.0;
  float cloudRadius = 1.025; // Just above earth surface
  float atmoRadius = 1.12;

  vec3 lightDir = normalize(vec3(0.5, 0.3, 0.8));

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

  // Cloud layer (rendered first, will be blended over earth)
  float cloudAlpha = 0.0;
  vec3 cloudColor = vec3(0.0);
  float cloudT = sphereIntersect(ro, rd, cloudRadius);
  if (cloudT > 0.0 && uCloudLoaded > 0.5) {
    vec3 cloudPos = ro + rd * cloudT;
    vec3 cloudNormal = normalize(cloudPos);

    float cosT = cos(earthTilt);
    float sinT = sin(earthTilt);
    vec3 tiltedCloudNormal = vec3(
      cloudNormal.x,
      cloudNormal.y * cosT - cloudNormal.z * sinT,
      cloudNormal.y * sinT + cloudNormal.z * cosT
    );

    float cloudLon = atan(tiltedCloudNormal.x, tiltedCloudNormal.z) + cloudRotation;
    float cloudLat = asin(clamp(tiltedCloudNormal.y, -1.0, 1.0));

    vec2 cloudUv = vec2(
      0.5 + cloudLon / (2.0 * PI),
      0.5 - cloudLat / PI
    );
    cloudUv.x = fract(cloudUv.x);

    vec4 cloudSample = texture2D(uCloudTexture, cloudUv);
    float cloudDensity = cloudSample.a; // Cloud coverage is in alpha channel

    // Cloud lighting
    float cloudDiff = max(dot(cloudNormal, lightDir), 0.0);
    float cloudLighting = 0.4 + cloudDiff * 0.6;

    cloudAlpha = cloudDensity * 0.7; // Semi-transparent clouds
    cloudColor = vec3(0.9, 0.92, 0.95) * cloudLighting;
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

    float limb = 1.0 - abs(dot(rd, normal));
    limb = pow(limb, 2.0);
    vec3 limbColor = vec3(0.15, 0.18, 0.24);
    surfaceColor = mix(surfaceColor, limbColor, limb * 0.6);
    surfaceColor += vec3(0.06, 0.08, 0.12) * limb * terminator;

    // Blend clouds over earth surface
    col = mix(surfaceColor, cloudColor, cloudAlpha);
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
    const cloudTexLoc = gl.getUniformLocation(program, "uCloudTexture");
    const texLoadedLoc = gl.getUniformLocation(program, "uTextureLoaded");
    const cloudLoadedLoc = gl.getUniformLocation(program, "uCloudLoaded");
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

    const loadEarthTexture = () => {
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

    // Load Cloud texture
    const cloudTexture = gl.createTexture();
    let cloudLoaded = false;

    const loadCloudTexture = () => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        cloudLoaded = true;
      };

      img.onerror = () => {
        console.warn("Failed to load cloud texture");
        cloudLoaded = false;
      };

      img.src = "https://raw.githubusercontent.com/matteason/live-cloud-maps/main/clouds_2048.png";
    };

    loadEarthTexture();
    loadCloudTexture();

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

      velocity.x = -deltaX * sensitivity; // Inverted so drag left = spin left
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

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cloudTexture);
      gl.uniform1i(cloudTexLoc, 1);
      gl.uniform1f(cloudLoadedLoc, cloudLoaded ? 1.0 : 0.0);

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
      gl.deleteTexture(cloudTexture);
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
