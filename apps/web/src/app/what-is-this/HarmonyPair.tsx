"use client";

import { useRef, useState, type PointerEvent } from "react";

import styles from "./HarmonyPair.module.css";

/**
 * A glass of milk and a cookie you can pick up. Drag the cookie
 * down into the glass and the surface covers it, so it reads as a dip.
 */
export function HarmonyPair() {
  const stageRef = useRef<HTMLDivElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState({ x: 150, y: 8 });
  const [holding, setHolding] = useState(false);
  const [dipped, setDipped] = useState(false);
  const [stars, setStars] = useState<{ id: number; dx: number; delay: number }[]>([]);
  const wasDipped = useRef(false);
  const starId = useRef(0);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = stage.getBoundingClientRect();
    grab.current = {
      dx: event.clientX - rect.left - pos.x,
      dy: event.clientY - rect.top - pos.y,
    };
    setHolding(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const stage = stageRef.current;
    if (!grab.current || !stage) return;
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left - grab.current.dx;
    const y = event.clientY - rect.top - grab.current.dy;
    setPos({ x, y });
    const overGlass = Math.abs(x + 40 - rect.width / 2) < 58;
    const intoMilk = y > rect.height * 0.34;
    const nowDipped = overGlass && intoMilk;
    if (nowDipped && !wasDipped.current) {
      const burst = Array.from({ length: 9 }, () => {
        starId.current += 1;
        return {
          id: starId.current,
          dx: Math.round((Math.random() - 0.5) * 120),
          delay: Math.round(Math.random() * 140),
        };
      });
      setStars((prev) => [...prev, ...burst]);
      const ids = new Set(burst.map((star) => star.id));
      window.setTimeout(() => {
        setStars((prev) => prev.filter((star) => !ids.has(star.id)));
      }, 1100);
    }
    wasDipped.current = nowDipped;
    setDipped(nowDipped);
  };

  const onPointerUp = () => {
    grab.current = null;
    setHolding(false);
  };

  return (
    <div ref={stageRef} className={styles.stage}>
      <div className={styles.scene}>
        <div className={dipped ? `${styles.glass} ${styles.glassSwell}` : styles.glass}>
          <div className={styles.liquid} />
        </div>
        <button
          type="button"
          className={
            dipped
              ? `${styles.cookie} ${styles.cookieDipped}`
              : holding
                ? `${styles.cookie} ${styles.cookieHeld}`
                : styles.cookie
          }
          style={{ left: pos.x, top: pos.y }}
          aria-label="Cookie. Drag it into the milk."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className={styles.cookieFace} />
          <span className={styles.cookieEdge} />
          <span className={styles.cookieBack} />
        </button>
        <div className={dipped ? `${styles.surface} ${styles.surfacePressed}` : styles.surface} />
        <div className={styles.rim} />
        {stars.map((star) => (
          <span
            key={star.id}
            className={styles.star}
            style={{
              animationDelay: `${star.delay}ms`,
              ["--dx" as string]: `${star.dx}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
