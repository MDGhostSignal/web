/**
 * Tiny helper for the common pattern used by every decorative WebGL
 * background in this project: a fullscreen quad running a custom
 * fragment shader, sized to the canvas, with a `requestAnimationFrame`
 * loop that can be cleaned up on unmount.
 *
 * Deliberately opinionated — it bundles the moves every component used
 * to repeat by hand:
 *
 *  - Compile vertex + fragment shader, log errors, bail to a fallback.
 *  - Build a static unit-quad buffer and bind `aPosition`.
 *  - Resize the canvas to `window.innerWidth × window.innerHeight`
 *    (capped at a configurable DPR).
 *  - Loop with an optional FPS cap.
 *  - Honour `prefers-reduced-motion` (skips the loop).
 *  - Return a single cleanup function the caller wires into
 *    `useEffect`'s cleanup.
 *
 * Components that need more (textures, mouse state, scroll-driven
 * uniforms) use `onFrame` to do the per-frame work — the helper just
 * hands them a live `gl`, `program`, and frame-time in seconds.
 */

const DEFAULT_VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

type StartShaderOptions = {
  /** Extra WebGL context attributes (alpha, antialias, powerPreference…). */
  contextAttributes?: WebGLContextAttributes;
  /** FPS cap; defaults to uncapped (60fps via rAF). */
  targetFps?: number;
  /** Max devicePixelRatio multiplier used for the backing store. Default: 2. */
  dprCap?: number;
  /**
   * Where the canvas should size itself from. "window" (default) uses
   * `window.innerWidth/innerHeight`; "parent" uses the bounding rect of
   * `canvas.parentElement` so the canvas fits an arbitrary section.
   */
  sizeMode?: "window" | "parent";
  /** Override the vertex shader (defaults to a fullscreen-quad passthrough). */
  vertexSource?: string;
  /**
   * Called once after the program is linked and the quad is bound. Use
   * this for one-shot setup like `gl.enable(gl.BLEND)` or caching
   * uniform locations the caller wants to reuse across frames.
   */
  onInit?: (args: { gl: WebGLRenderingContext; program: WebGLProgram }) => void;
  /**
   * Called once per frame. Use this to push per-frame uniforms and draw.
   * The helper doesn't call `gl.drawArrays` for you — the final draw call
   * is inside `onFrame` so extensions (multi-pass, different primitives)
   * stay possible.
   */
  onFrame: (args: {
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    time: number;
    width: number;
    height: number;
  }) => void;
  /**
   * Optional fallback, run when WebGL is unavailable or shader compilation
   * fails. A common pattern is `(canvas) => { canvas.style.background = … }`.
   */
  onFallback?: (canvas: HTMLCanvasElement) => void;
  /**
   * Skip the animation loop when the user has `prefers-reduced-motion`
   * set. Defaults to true; `onFallback` still runs so the canvas can
   * show a static color.
   */
  respectReducedMotion?: boolean;
};

/**
 * Start a fullscreen-quad shader on the given canvas. Returns a cleanup
 * function; call it from `useEffect`'s return value.
 */
export function startFullscreenShader(
  canvas: HTMLCanvasElement,
  fragmentSource: string,
  options: StartShaderOptions,
): () => void {
  const {
    contextAttributes,
    targetFps,
    dprCap = 2,
    sizeMode = "window",
    vertexSource = DEFAULT_VERTEX_SHADER,
    onInit,
    onFrame,
    onFallback,
    respectReducedMotion = true,
  } = options;

  const fallback = () => onFallback?.(canvas);

  if (
    respectReducedMotion &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    fallback();
    return () => {};
  }

  const gl = canvas.getContext("webgl", contextAttributes);
  if (!gl) {
    fallback();
    return () => {};
  }

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();

  if (!vertexShader || !fragmentShader || !program) {
    fallback();
    return () => {};
  }

  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
    fallback();
    return () => {};
  }

  gl.shaderSource(fragmentShader, fragmentSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
    fallback();
    return () => {};
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    fallback();
    return () => {};
  }

  gl.useProgram(program);

  // Unit quad covering the viewport
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  onInit?.({ gl, program });

  // Resize to window (default) or parent element, capped DPR
  const handleResize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    let cssWidth: number;
    let cssHeight: number;
    if (sizeMode === "parent" && canvas.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
    } else {
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
    }
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  handleResize();
  window.addEventListener("resize", handleResize);

  const startTime = performance.now();
  let rafId = 0;
  let lastFrame = 0;
  const frameInterval = targetFps ? 1000 / targetFps : 0;

  const render = (currentTime: number) => {
    rafId = requestAnimationFrame(render);
    if (frameInterval) {
      const elapsed = currentTime - lastFrame;
      if (elapsed < frameInterval) return;
      lastFrame = currentTime - (elapsed % frameInterval);
    }
    const time = (currentTime - startTime) * 0.001;
    onFrame({ gl, program, time, width: canvas.width, height: canvas.height });
  };
  rafId = requestAnimationFrame(render);

  return () => {
    window.removeEventListener("resize", handleResize);
    cancelAnimationFrame(rafId);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteBuffer(positionBuffer);
  };
}
