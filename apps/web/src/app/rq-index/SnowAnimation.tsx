"use client";

import { useEffect, useRef } from "react";

type Snowflake = {
  x: number;
  y: number;
  speed: number;
  opacity: number;
};

export function SnowAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snowflakesRef = useRef<Snowflake[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initialize snowflakes - keep count low for performance
    const snowflakeCount = 25;
    snowflakesRef.current = Array.from({ length: snowflakeCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.15 + Math.random() * 0.25, // Very slow falling
      opacity: 0.3 + Math.random() * 0.5,
    }));

    let lastTime = 0;
    const targetFPS = 30; // Limit to 30 FPS for performance
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);

      // Throttle to target FPS
      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      lastTime = currentTime - (deltaTime % frameInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakesRef.current.forEach((flake) => {
        // Draw single pixel snowflake
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fillRect(Math.floor(flake.x), Math.floor(flake.y), 1, 1);

        // Move snowflake down
        flake.y += flake.speed;

        // Slight horizontal drift
        flake.x += Math.sin(currentTime * 0.0005 + flake.y * 0.01) * 0.1;

        // Reset when off screen
        if (flake.y > canvas.height) {
          flake.y = -2;
          flake.x = Math.random() * canvas.width;
        }

        // Wrap horizontally
        if (flake.x > canvas.width) flake.x = 0;
        if (flake.x < 0) flake.x = canvas.width;
      });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
