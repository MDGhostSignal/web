"use client";

import { useRef, useCallback, useEffect } from "react";

type ScaleQuestionProps = {
  id: string;
  label: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
};

/**
 * Calculate the visual position percentage for a score.
 * Maps 1-5 to 0-50% and 5-10 to 50-100%, ensuring 5 is exactly centered.
 */
function scoreToPosition(score: number): number {
  if (score <= 5) {
    return ((score - 1) / 4) * 50;
  }
  return 50 + ((score - 5) / 5) * 50;
}

/**
 * Calculate the score from a visual position percentage.
 * Inverse of scoreToPosition.
 */
function positionToScore(position: number, min: number, max: number): number {
  let score: number;
  if (position <= 50) {
    score = 1 + (position / 50) * 4;
  } else {
    score = 5 + ((position - 50) / 50) * 5;
  }
  // Round to nearest integer and clamp to min/max
  return Math.max(min, Math.min(max, Math.round(score)));
}

export function ScaleQuestion({
  id,
  label,
  min = 1,
  max = 10,
  value,
  onChange,
}: ScaleQuestionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const thumbPosition = scoreToPosition(value);

  const updateValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      const newScore = positionToScore(percentage, min, max);
      if (newScore !== value) {
        onChange(newScore);
      }
    },
    [min, max, value, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      updateValueFromPosition(e.clientX);
    },
    [updateValueFromPosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDragging.current = true;
      if (e.touches[0]) {
        updateValueFromPosition(e.touches[0].clientX);
      }
    },
    [updateValueFromPosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        updateValueFromPosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches[0]) {
        updateValueFromPosition(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      isDragging.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [updateValueFromPosition]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      if (value < max) onChange(value + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      if (value > min) onChange(value - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div className="rq-question">
      <label htmlFor={id} className="rq-question-label">
        {label}
      </label>
      <div className="rq-scale">
        <div
          id={id}
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
          className="rq-slider-custom"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onKeyDown={handleKeyDown}
          ref={trackRef}
        >
          <div className="rq-slider-track">
            {/* Center marker at exactly 50% */}
            <div className="rq-slider-center-mark" />
            {/* Thumb positioned according to our formula */}
            <div
              className="rq-slider-thumb"
              style={{ left: `${thumbPosition}%` }}
            />
          </div>
        </div>
        <div className="rq-scale-value">{value}</div>
      </div>
      <div className="rq-scale-labels">
        <span className="rq-scale-label-min">{min} = Lowest</span>
        <span className="rq-scale-label-center">5 = Neutral</span>
        <span className="rq-scale-label-max">{max} = Highest</span>
      </div>
    </div>
  );
}
