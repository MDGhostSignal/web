"use client";

import { useEffect, useRef, useState } from "react";
// Aliased — `new Image()` below needs the DOM constructor, not the
// `next/image` component with the same name.
import NextImage from "next/image";

type Props = {
  src: string;
  className?: string;
};

/**
 * GPU-rendered liquid-ripple effect for the decorative color-bars
 * backdrop.
 *
 * Split into two layers of resolution:
 *  - Wave simulation runs on the CPU on a low-res 2D height field
 *    (Hugo Elias shallow-water algorithm, two Float32Array buffers).
 *  - Bars image and final output are rendered on the GPU at the
 *    canvas's native device-pixel size. The low-res height field is
 *    uploaded to a texture each frame and used as a displacement map;
 *    the GPU bilinearly interpolates it up to full resolution, which
 *    is why the bars stay crisp while the ripples stay smooth.
 *
 * Shipping gates:
 *  - Only active on devices that have a real hover-capable pointer
 *    (`hover: hover` + `pointer: fine`). Phones can't hover, so the
 *    effect would never trigger — we skip the RAF loop entirely and
 *    render the static PNG instead.
 *  - `prefers-reduced-motion: reduce` disables it.
 *  - If WebGL context creation fails (ancient GPU / headless browser
 *    / disabled), we also fall back to the static PNG.
 */
export default function BarsRipple({ src, className }: Props) {
  // On SSR and the very first client render, show the static image so
  // the markup is identical across server/client (avoids hydration
  // warnings). The effect component mounts after we probe capabilities.
  const [mode, setMode] = useState<"probe" | "webgl" | "static">("probe");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canHover =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Intentional post-mount setState: we need client-only capability
    // probes (matchMedia) to switch modes, and SSR must render the
    // same "probe" fallback to keep hydration clean.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(canHover && !reduced ? "webgl" : "static");
  }, []);

  if (mode !== "webgl") {
    return (
      <div className={className} aria-hidden="true">
        <NextImage
          src={src}
          alt=""
          width={652}
          height={7548}
          aria-hidden="true"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return <RippleCanvas src={src} className={className} />;
}

/**
 * Active ripple surface. Split from the outer gate so the WebGL setup
 * only runs on devices that passed the probe above.
 */
function RippleCanvas({ src, className }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [glFailed, setGlFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
    }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) {
      setGlFailed(true);
      return;
    }

    // ---------------------------------------------------------------
    // Simulation grid — CPU-side height field. Intentionally modest
    // so the per-frame JS cost stays cheap; the GPU bilinear upsamples
    // it into the full-res output, so visual crispness comes from the
    // shader, not the grid.
    // ---------------------------------------------------------------
    const SIM_W = 100;
    const SIM_H = 800;
    let cur = new Float32Array(SIM_W * SIM_H);
    let prev = new Float32Array(SIM_W * SIM_H);
    const dispBytes = new Uint8Array(SIM_W * SIM_H * 4);
    const DAMPING = 0.988;
    // How strongly the displacement bends the bars (in UV-space
    // fractions of the texture). Tuned by eye.
    const DISP_SCALE = 0.03;

    // ---------------------------------------------------------------
    // Shader program
    // ---------------------------------------------------------------
    const vs = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_bars;
      uniform sampler2D u_disp;
      uniform float u_scale;
      void main() {
        vec2 d = texture2D(u_disp, v_uv).rg - vec2(0.5);
        vec2 uv = v_uv + d * u_scale;
        gl_FragColor = texture2D(u_bars, uv);
      }
    `;

    const compile = (type: number, source: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vsh = compile(gl.VERTEX_SHADER, vs);
    const fsh = compile(gl.FRAGMENT_SHADER, fs);
    const program = gl.createProgram();
    if (!vsh || !fsh || !program) {
      setGlFailed(true);
      return;
    }
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setGlFailed(true);
      return;
    }
    gl.useProgram(program);

    // Fullscreen quad.
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uBars = gl.getUniformLocation(program, "u_bars");
    const uDisp = gl.getUniformLocation(program, "u_disp");
    const uScale = gl.getUniformLocation(program, "u_scale");
    gl.uniform1i(uBars, 0);
    gl.uniform1i(uDisp, 1);
    gl.uniform1f(uScale, DISP_SCALE);

    // ---------------------------------------------------------------
    // Textures
    // ---------------------------------------------------------------

    // Displacement texture (unit 1) — uploaded each frame from
    // `dispBytes`, populated from the wave sim's gradient.
    const dispTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dispTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Initialize all cells to (128, 128) — zero displacement.
    for (let i = 0; i < SIM_W * SIM_H; i++) {
      dispBytes[i * 4] = 128;
      dispBytes[i * 4 + 1] = 128;
      dispBytes[i * 4 + 2] = 128;
      dispBytes[i * 4 + 3] = 255;
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      SIM_W,
      SIM_H,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      dispBytes,
    );

    // Bars texture (unit 0) — uploaded once from the loaded PNG.
    const barsTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, barsTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // One-pixel placeholder so the program is drawable before the
    // real image arrives.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]),
    );

    let barsReady = false;
    const img = new Image();
    const onImgLoad = () => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, barsTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img,
      );
      barsReady = true;
    };
    img.addEventListener("load", onImgLoad);
    img.src = src;

    // ---------------------------------------------------------------
    // Canvas sizing — match display size × devicePixelRatio so output
    // matches what a plain <img> would render at.
    // ---------------------------------------------------------------
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ---------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------
    let lastX = -1;
    let lastY = -1;
    let lastMoveTs = 0;

    const drop = (fx: number, fy: number, strength: number) => {
      const cx = fx | 0;
      const cy = fy | 0;
      const R = 3;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > R) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 1 || y < 1 || x >= SIM_W - 1 || y >= SIM_H - 1) continue;
          cur[y * SIM_W + x] += strength * (1 - d / R);
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        lastX = -1;
        lastY = -1;
        return;
      }
      const x = ((e.clientX - rect.left) / rect.width) * SIM_W;
      const y = ((e.clientY - rect.top) / rect.height) * SIM_H;
      const now = performance.now();
      if (lastX >= 0 && lastY >= 0 && now - lastMoveTs < 250) {
        const dist = Math.hypot(x - lastX, y - lastY);
        const steps = Math.max(1, Math.min(16, Math.floor(dist / 2)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          drop(lastX + (x - lastX) * t, lastY + (y - lastY) * t, 26);
        }
      } else {
        drop(x, y, 40);
      }
      lastX = x;
      lastY = y;
      lastMoveTs = now;
    };
    window.addEventListener("mousemove", onMove);

    // ---------------------------------------------------------------
    // Frame loop
    // ---------------------------------------------------------------
    let raf = 0;
    let running = true;

    const step = () => {
      // 1. Wave update into `prev` using `cur`.
      for (let y = 1; y < SIM_H - 1; y++) {
        const row = y * SIM_W;
        for (let x = 1; x < SIM_W - 1; x++) {
          const i = row + x;
          const v =
            (cur[i - SIM_W] + cur[i + SIM_W] + cur[i - 1] + cur[i + 1]) / 2 -
            prev[i];
          prev[i] = v * DAMPING;
        }
      }
      const tmp = cur;
      cur = prev;
      prev = tmp;

      // 2. Build displacement bytes from the gradient of `cur`, scaled
      //    into 0..255 around 128 (neutral). Clamp so steep gradients
      //    don't wrap-around visually.
      for (let y = 0; y < SIM_H; y++) {
        const row = y * SIM_W;
        for (let x = 0; x < SIM_W; x++) {
          const i = row + x;
          let ox = 0;
          let oy = 0;
          if (x > 0 && x < SIM_W - 1) ox = cur[i - 1] - cur[i + 1];
          if (y > 0 && y < SIM_H - 1) oy = cur[i - SIM_W] - cur[i + SIM_W];
          // Multiplier converts wave amplitude into a usable 0..255
          // displacement range; 8.0 felt right for the splash strength
          // tuned above.
          let rx = 128 + ox * 8.0;
          let ry = 128 + oy * 8.0;
          if (rx < 0) rx = 0;
          else if (rx > 255) rx = 255;
          if (ry < 0) ry = 0;
          else if (ry > 255) ry = 255;
          const o = i << 2;
          dispBytes[o] = rx;
          dispBytes[o + 1] = ry;
          // B/A stay at their init values.
        }
      }

      // 3. Upload displacement + draw.
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, dispTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        SIM_W,
        SIM_H,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        dispBytes,
      );

      if (barsReady) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      if (running) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // ---------------------------------------------------------------
    // Visibility — pause the RAF when the tab is hidden.
    // ---------------------------------------------------------------
    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (!running) {
          running = true;
          raf = requestAnimationFrame(step);
        }
      } else {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // ---------------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------------
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      img.removeEventListener("load", onImgLoad);
      gl.deleteTexture(barsTex);
      gl.deleteTexture(dispTex);
      gl.deleteBuffer(quadBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vsh);
      gl.deleteShader(fsh);
    };
  }, [src]);

  if (glFailed) {
    return (
      <div className={className} aria-hidden="true">
        <NextImage
          src={src}
          alt=""
          width={652}
          height={7548}
          aria-hidden="true"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
