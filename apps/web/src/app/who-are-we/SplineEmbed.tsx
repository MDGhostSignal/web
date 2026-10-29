"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import styles from "./page.module.css";

interface SplineEmbedProps {
  scene: string;
  className?: string;
  /** Hex surface color for mesh materials. Omit to keep the scene's own color. */
  color?: string;
}

export default function SplineEmbed({ scene, className, color }: SplineEmbedProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hide Spline UI elements (watermark and interaction hints)
    const hideSplineUI = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const splineViewer = wrapper.querySelector("spline-viewer");
      if (!splineViewer?.shadowRoot) return;

      const shadowRoot = splineViewer.shadowRoot;

      // Inject CSS into shadow DOM to hide all UI overlays
      if (!shadowRoot.querySelector("#spline-hide-ui")) {
        const style = document.createElement("style");
        style.id = "spline-hide-ui";
        style.textContent = `
          #logo,
          #hint,
          [id*="logo"],
          [id*="hint"],
          [class*="logo"],
          [class*="hint"],
          [class*="Logo"],
          [class*="Hint"],
          [class*="watermark"],
          [class*="Watermark"],
          [class*="drag"],
          [class*="Drag"],
          [class*="cursor"],
          [class*="Cursor"],
          [class*="overlay"]:not(canvas),
          a[href*="spline"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        shadowRoot.appendChild(style);
      }

      // Also directly hide known elements
      const elementsToHide = shadowRoot.querySelectorAll(
        '#logo, #hint, a[href*="spline"], [class*="hint"], [class*="logo"]'
      );
      elementsToHide.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = "none";
        }
      });
    };

    // Try immediately and also after delays (for slow loads)
    hideSplineUI();
    const timer1 = setTimeout(hideSplineUI, 500);
    const timer2 = setTimeout(hideSplineUI, 1500);
    const timer3 = setTimeout(hideSplineUI, 3000);
    const timer4 = setTimeout(hideSplineUI, 5000);

    // Touch-only lock: set `events-target="none"` on the
    // <spline-viewer> so the runtime ignores pointer input entirely.
    // This is the scene-level counterpart of the CSS
    // `pointer-events: none` applied on touch in page.module.css --
    // belt + suspenders so the 3D object stays locked on iPads and
    // phones while desktop retains full interactivity.
    const isTouch =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const applyTouchLock = () => {
      if (!isTouch) return;
      const viewer = wrapperRef.current?.querySelector("spline-viewer");
      if (viewer) viewer.setAttribute("events-target", "none");
    };
    applyTouchLock();
    const touchTimer = setTimeout(applyTouchLock, 500);

    const paintSurface = () => {
      if (!color) return;
      const viewer = wrapperRef.current?.querySelector("spline-viewer") as
        | (HTMLElement & {
            _spline?: {
              getAllObjects?: () => Array<{ material?: unknown; color?: string }>;
            };
          })
        | null;
      const objects = viewer?._spline?.getAllObjects?.() ?? [];
      for (const obj of objects) {
        if (obj.material) obj.color = color;
      }
    };
    const viewerEl = wrapperRef.current?.querySelector("spline-viewer");
    viewerEl?.addEventListener("load-complete", paintSurface);
    paintSurface();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(touchTimer);
      viewerEl?.removeEventListener("load-complete", paintSurface);
    };
  }, [color]);

  return (
    <div ref={wrapperRef} className={className ?? styles.splineWrapper}>
      <Script
        type="module"
        src="/vendor/spline/spline-viewer-1.12.79.js"
        strategy="lazyOnload"
      />
      {/* @ts-expect-error - spline-viewer is a custom element */}
      <spline-viewer
        url={scene}
        style={{ width: "100%", height: "100%" }}
        hint="false"
        loading-anim-type="none"
      />
    </div>
  );
}
