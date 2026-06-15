"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two extruded 3D wordmark hero components for the XQ quiz.
 *
 * `XQ3DWordmark` is the original — depth-stacked slices, italic Geist,
 * mouse-tracked light, diagonal chrome sweep, warm purple→white palette.
 *
 * `RQ3DWordmark` is the companion — same extrusion technique but tuned
 * for an 80s action-movie title vibe: italic chunky letters, magenta →
 * cyan retrowave gradient, neon outline, horizontal scanline sweep
 * (instead of diagonal), cyan-tinted mouse light, sunset-glow drop
 * shadow. The small GHOSTSignal lockup in the lower-right matches
 * the XQ wordmark exactly so the brand line stays consistent.
 */

const FONT_FAMILY =
  '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const SLICE_COUNT = 18;
const SLICE_STEP = 0.55;

/** Mouse-tracked light position in SVG viewBox coords. Lerped each
 *  frame so the highlight glides rather than snaps. Shared between
 *  both wordmarks. */
function useTrackedLight(
  svgRef: React.RefObject<SVGSVGElement | null>,
  initial: { x: number; y: number } = { x: 400, y: 80 },
) {
  const targetRef = useRef(initial);
  const [pos, setPos] = useState(initial);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      targetRef.current = {
        x: Math.max(-100, Math.min(900, nx * 800)),
        y: Math.max(-50, Math.min(290, ny * 240)),
      };
    };

    let raf = 0;
    const tick = () => {
      setPos((prev) => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.085,
        y: prev.y + (targetRef.current.y - prev.y) * 0.085,
      }));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(raf);
    };
  }, [svgRef]);

  return pos;
}

/** GHOSTSignal lockup pinned to the lower-right corner of the wordmark.
 *  Identical across XQ and RQ so the brand line stays unified. */
function GhostSignalLockup() {
  return (
    <text
      x="540"
      y="208"
      textAnchor="end"
      fontFamily={FONT_FAMILY}
      fontSize="13"
      fill="#fff"
      opacity="0.92"
    >
      <tspan fontWeight="800" letterSpacing="2.4">
        GHOST
      </tspan>
      <tspan fontWeight="300" letterSpacing="0.6">
        Signal
      </tspan>
    </text>
  );
}

// ===== XQ ===========================================================

export function XQ3DWordmark() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const light = useTrackedLight(svgRef);

  const slices = Array.from({ length: SLICE_COUNT }, (_, i) => {
    const t = i / (SLICE_COUNT - 1);
    const r = Math.round(40 + (150 - 40) * t);
    const g = Math.round(28 + (130 - 28) * t);
    const b = Math.round(70 + (175 - 70) * t);
    const dx = (SLICE_COUNT - 1 - i) * -SLICE_STEP;
    const dy = (SLICE_COUNT - 1 - i) * SLICE_STEP;
    return (
      <text
        key={i}
        x="400"
        y="172"
        transform={`translate(${dx} ${dy})`}
        fill={`rgb(${r}, ${g}, ${b})`}
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
      >
        XQ
      </text>
    );
  });

  return (
    <svg
      ref={svgRef}
      className="xq-intro-hero-svg"
      viewBox="0 0 800 240"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="xq-front-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9a8db5" />
          <stop offset="35%" stopColor="#c3b4dc" />
          <stop offset="70%" stopColor="#ebdcfa" />
          <stop offset="100%" stopColor="#fff5ff" />
        </linearGradient>
        <linearGradient id="xq-specular" x1="0.5" y1="1" x2="0.58" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
        <radialGradient
          id="xq-mouse-light"
          cx={light.x}
          cy={light.y}
          r="220"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(255,250,255,0.85)" />
          <stop offset="25%" stopColor="rgba(255,245,255,0.40)" />
          <stop offset="60%" stopColor="rgba(255,240,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,240,255,0)" />
        </radialGradient>
        <filter
          id="xq-soft-shadow"
          x="-10%"
          y="-10%"
          width="120%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dx="-2" dy="8" result="shadow" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.32" />
          </feComponentTransfer>
        </filter>
        <clipPath id="xq-shimmer-clip">
          <text
            x="400"
            y="172"
            textAnchor="middle"
            fontSize="220"
            fontFamily={FONT_FAMILY}
            fontWeight={900}
            fontStyle="italic"
            letterSpacing="-10"
          >
            XQ
          </text>
        </clipPath>
        <linearGradient id="xq-shimmer-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="42%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="58%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <g filter="url(#xq-soft-shadow)">
        <text
          x="400"
          y="172"
          textAnchor="middle"
          fontSize="220"
          fontFamily={FONT_FAMILY}
          fontWeight={900}
          fontStyle="italic"
          letterSpacing="-10"
          fill="#000"
        >
          XQ
        </text>
      </g>

      {slices}

      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#xq-front-fill)"
      >
        XQ
      </text>
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#xq-specular)"
      >
        XQ
      </text>
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#xq-mouse-light)"
        style={{ mixBlendMode: "screen" }}
      >
        XQ
      </text>

      <GhostSignalLockup />

      <g clipPath="url(#xq-shimmer-clip)">
        <g>
          <rect
            x="-100"
            y="-320"
            width="200"
            height="640"
            fill="url(#xq-shimmer-band)"
            transform="rotate(28)"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            from="-100 500"
            to="900 -200"
            dur="4.2s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </svg>
  );
}

// ===== RQ ===========================================================

/** RQ wordmark — 80s action-movie title aesthetic. Same depth
 *  extrusion approach as the XQ but tuned to retrowave colors:
 *  magenta → cyan front gradient, neon-pink outer halo, horizontal
 *  scanline sweep, sunset-glow drop shadow, cyan mouse light.
 *  Brand lockup matches the XQ exactly. */
export function RQ3DWordmark() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Start the light near the top-left so the sheen reads as a hard
  // sunrise highlight on the letters — different from XQ's top-right.
  const light = useTrackedLight(svgRef, { x: 280, y: 60 });

  // Retrowave depth ramp: deep navy/violet back → hot magenta middle
  // → near-white pink front. Each slice nudges right + down so the
  // extrusion catches the implied bottom-right vanishing point.
  const slices = Array.from({ length: SLICE_COUNT }, (_, i) => {
    const t = i / (SLICE_COUNT - 1);
    const r = Math.round(28 + (240 - 28) * t);
    const g = Math.round(18 + (90 - 18) * t);
    const b = Math.round(72 + (200 - 72) * t);
    const dx = (SLICE_COUNT - 1 - i) * SLICE_STEP * 0.7;
    const dy = (SLICE_COUNT - 1 - i) * SLICE_STEP;
    return (
      <text
        key={i}
        x="400"
        y="172"
        transform={`translate(${dx} ${dy})`}
        fill={`rgb(${r}, ${g}, ${b})`}
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
      >
        RQ
      </text>
    );
  });

  return (
    <svg
      ref={svgRef}
      className="xq-intro-hero-svg"
      viewBox="0 0 800 240"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        {/* Front-face fill — retrowave magenta → cyan horizontal. */}
        <linearGradient id="rq-front-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff2e88" />
          <stop offset="40%" stopColor="#ff5fb0" />
          <stop offset="70%" stopColor="#bf6fff" />
          <stop offset="100%" stopColor="#39d6ff" />
        </linearGradient>
        {/* Top highlight band — bright pink-white scan running across
         * the top third of the letters. Reads as a single horizontal
         * sweep instead of XQ's diagonal specular. */}
        <linearGradient id="rq-top-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Cyan-tinted mouse light. Cooler than XQ's warm white. */}
        <radialGradient
          id="rq-mouse-light"
          cx={light.x}
          cy={light.y}
          r="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="rgba(150,250,255,0.95)" />
          <stop offset="30%" stopColor="rgba(120,200,255,0.45)" />
          <stop offset="65%" stopColor="rgba(120,160,255,0.10)" />
          <stop offset="100%" stopColor="rgba(120,160,255,0)" />
        </radialGradient>
        {/* Sunset drop shadow — magenta/pink glow rather than pure
         * black. Reads as the neon afterimage behind the letters. */}
        <filter
          id="rq-neon-shadow"
          x="-15%"
          y="-15%"
          width="130%"
          height="150%"
          filterUnits="objectBoundingBox"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" />
          <feOffset dx="0" dy="10" result="shadow" />
          <feFlood floodColor="#ff2e88" floodOpacity="0.55" />
          <feComposite in2="shadow" operator="in" />
        </filter>
        {/* Horizontal scanline texture — thin alternating bright/dark
         * lines that overlay the letters for a CRT title feel. */}
        <pattern
          id="rq-scanlines"
          x="0"
          y="0"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <rect width="6" height="3" fill="rgba(255,255,255,0.18)" />
          <rect y="3" width="6" height="3" fill="rgba(0,0,0,0.16)" />
        </pattern>
        <clipPath id="rq-letter-clip">
          <text
            x="400"
            y="172"
            textAnchor="middle"
            fontSize="220"
            fontFamily={FONT_FAMILY}
            fontWeight={900}
            fontStyle="italic"
            letterSpacing="-10"
          >
            RQ
          </text>
        </clipPath>
        {/* Horizontal sweep band — runs left-to-right across the
         * letters on a loop. Differs from XQ's diagonal sweep so the
         * two wordmarks read as siblings, not twins. */}
        <linearGradient id="rq-sweep-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="44%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="56%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Magenta neon drop shadow */}
      <g filter="url(#rq-neon-shadow)">
        <text
          x="400"
          y="172"
          textAnchor="middle"
          fontSize="220"
          fontFamily={FONT_FAMILY}
          fontWeight={900}
          fontStyle="italic"
          letterSpacing="-10"
          fill="#000"
        >
          RQ
        </text>
      </g>

      {/* Extruded depth slices */}
      {slices}

      {/* Front face — retrowave gradient */}
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#rq-front-fill)"
      >
        RQ
      </text>

      {/* Scanline overlay clipped to the letters */}
      <g clipPath="url(#rq-letter-clip)" style={{ mixBlendMode: "overlay" }}>
        <rect x="0" y="0" width="800" height="240" fill="url(#rq-scanlines)" />
      </g>

      {/* Top sheen — horizontal scan band at the top of the letters */}
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#rq-top-sheen)"
      >
        RQ
      </text>

      {/* Cyan-tinted mouse light overlay */}
      <text
        x="400"
        y="172"
        textAnchor="middle"
        fontSize="220"
        fontFamily={FONT_FAMILY}
        fontWeight={900}
        fontStyle="italic"
        letterSpacing="-10"
        fill="url(#rq-mouse-light)"
        style={{ mixBlendMode: "screen" }}
      >
        RQ
      </text>

      <GhostSignalLockup />

      {/* Horizontal sweep — left-to-right band on a loop. */}
      <g clipPath="url(#rq-letter-clip)">
        <g>
          <rect
            x="-200"
            y="-50"
            width="240"
            height="340"
            fill="url(#rq-sweep-band)"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            from="-200 0"
            to="900 0"
            dur="3.6s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </svg>
  );
}
