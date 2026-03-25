"use client";

import type { RQResult } from "@/lib/rq/scoring";
import "./RQRadarChart.css";

type RQRadarChartProps = {
  result: RQResult;
  size?: number;
};

type AxisConfig = {
  key: "values" | "authenticity" | "horizon";
  angle: number; // degrees from top (0° = 12 o'clock)
  leftLabel: string;
  rightLabel: string;
  name: string;
};

const AXIS_CONFIG: AxisConfig[] = [
  { key: "values", angle: 270, leftLabel: "I", rightLabel: "F", name: "Values" },
  { key: "authenticity", angle: 30, leftLabel: "S", rightLabel: "R", name: "Authenticity" },
  { key: "horizon", angle: 150, leftLabel: "L", rightLabel: "C", name: "Horizon" },
];

// Scale rings (1-10 scale, all levels)
const SCALE_RINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function RQRadarChart({ result, size = 420 }: RQRadarChartProps) {
  const center = size / 2;
  const maxRadius = (size / 2) - 60; // Leave room for labels
  const minRadius = 20; // Don't go all the way to center

  // Calculate the radius for a given score (1-10)
  const scoreToRadius = (score: number): number => {
    const normalizedScore = (score - 1) / 9; // 0 to 1
    return minRadius + normalizedScore * (maxRadius - minRadius);
  };

  // Get the data points for each axis
  const dataPoints = AXIS_CONFIG.map((axis) => {
    const detail = result.details[axis.key];
    const score = detail.score;
    const letter = detail.letter;
    const isRightSide = letter === axis.rightLabel;

    // The radius represents the score strength
    const radius = scoreToRadius(score);
    const point = polarToCartesian(center, center, radius, axis.angle);

    return {
      ...axis,
      score,
      letter,
      isRightSide,
      radius,
      x: point.x,
      y: point.y,
    };
  });

  // Create the polygon path
  const polygonPath = dataPoints.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
  ).join(" ") + " Z";

  // Generate axis lines
  const axisLines = AXIS_CONFIG.map((axis) => {
    const outerPoint = polarToCartesian(center, center, maxRadius + 10, axis.angle);
    return {
      ...axis,
      x1: center,
      y1: center,
      x2: outerPoint.x,
      y2: outerPoint.y,
    };
  });

  // Generate scale rings
  const rings = SCALE_RINGS.map((value) => ({
    value,
    radius: scoreToRadius(value),
  }));

  // Label positions (outside the chart)
  const labelPositions = AXIS_CONFIG.map((axis) => {
    const labelRadius = maxRadius + 35;
    const point = polarToCartesian(center, center, labelRadius, axis.angle);
    const detail = result.details[axis.key];
    return {
      ...axis,
      x: point.x,
      y: point.y,
      activeLabel: detail.letter,
      score: detail.score,
    };
  });

  return (
    <div className="rq-radar-container">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="rq-radar-svg"
        role="img"
        aria-label="Resonance Quotient radar chart showing your signal profile"
      >
        {/* Background rings */}
        <g className="rq-radar-rings">
          {rings.map((ring) => (
            <circle
              key={ring.value}
              cx={center}
              cy={center}
              r={ring.radius}
              className="rq-radar-ring"
            />
          ))}
        </g>

        {/* Axis lines */}
        <g className="rq-radar-axes">
          {axisLines.map((axis) => (
            <line
              key={axis.key}
              x1={axis.x1}
              y1={axis.y1}
              x2={axis.x2}
              y2={axis.y2}
              className="rq-radar-axis-line"
            />
          ))}
        </g>

        {/* Scale labels (only on one axis, key markers only) */}
        <g className="rq-radar-scale-labels">
          {rings
            .filter((ring) => ring.value === 1 || ring.value === 5 || ring.value === 10)
            .map((ring) => {
              // Place scale labels along the top axis (270°)
              const pos = polarToCartesian(center, center, ring.radius, 270);
              return (
                <text
                  key={ring.value}
                  x={pos.x - 12}
                  y={pos.y + 4}
                  className="rq-radar-scale-text"
                >
                  {ring.value}
                </text>
              );
            })}
        </g>

        {/* Filled polygon */}
        <path
          d={polygonPath}
          className="rq-radar-polygon"
        />

        {/* Polygon outline */}
        <path
          d={polygonPath}
          className="rq-radar-polygon-outline"
        />

        {/* Data points */}
        <g className="rq-radar-points">
          {dataPoints.map((point) => (
            <g key={point.key}>
              {/* Glow effect */}
              <circle
                cx={point.x}
                cy={point.y}
                r={12}
                className="rq-radar-point-glow"
              />
              {/* Main point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={6}
                className="rq-radar-point"
              />
            </g>
          ))}
        </g>

        {/* Axis labels */}
        <g className="rq-radar-labels">
          {labelPositions.map((label) => (
            <g key={label.key}>
              {/* Axis name */}
              <text
                x={label.x}
                y={label.y - 8}
                className="rq-radar-axis-name"
                textAnchor="middle"
              >
                {label.name}
              </text>
              {/* Letter pair with active highlighted */}
              <text
                x={label.x}
                y={label.y + 10}
                className="rq-radar-letter-pair"
                textAnchor="middle"
              >
                <tspan className={label.activeLabel === label.leftLabel ? "active" : "inactive"}>
                  {label.leftLabel}
                </tspan>
                <tspan className="separator"> / </tspan>
                <tspan className={label.activeLabel === label.rightLabel ? "active" : "inactive"}>
                  {label.rightLabel}
                </tspan>
              </text>
              {/* Score */}
              <text
                x={label.x}
                y={label.y + 26}
                className="rq-radar-score"
                textAnchor="middle"
              >
                {label.activeLabel}({label.score})
              </text>
            </g>
          ))}
        </g>

        {/* Center marker */}
        <circle
          cx={center}
          cy={center}
          r={3}
          className="rq-radar-center"
        />
      </svg>

      {/* Legend */}
      <div className="rq-radar-legend">
        <div className="rq-radar-legend-item">
          <span className="rq-radar-legend-dot"></span>
          <span>Your Signal Profile</span>
        </div>
        <p className="rq-radar-legend-note">
          Distance from center indicates signal strength (1–10)
        </p>
      </div>
    </div>
  );
}
