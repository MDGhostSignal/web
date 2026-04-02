import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Generates an RQ radar chart as a PNG image
 *
 * Query params:
 * - vl: Values letter (F or I)
 * - vs: Values score (1-10)
 * - al: Authenticity letter (R or S)
 * - as: Authenticity score (1-10)
 * - hl: Horizon letter (L or C)
 * - hs: Horizon score (1-10)
 *
 * Example: /api/rq-chart?vl=F&vs=7&al=R&as=8&hl=C&hs=5
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse query parameters with defaults
  const valuesLetter = searchParams.get("vl") || "F";
  const valuesScore = parseInt(searchParams.get("vs") || "5", 10);
  const authLetter = searchParams.get("al") || "R";
  const authScore = parseInt(searchParams.get("as") || "5", 10);
  const horizonLetter = searchParams.get("hl") || "L";
  const horizonScore = parseInt(searchParams.get("hs") || "5", 10);

  // Chart dimensions
  const size = 400;
  const center = size / 2;
  const maxRadius = (size / 2) - 60;
  const minRadius = 20;

  // Convert polar to cartesian
  const polarToCartesian = (r: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  // Score to radius (5 at center, spreading outward)
  const scoreToRadius = (score: number) => {
    const normalized = score <= 5
      ? ((score - 1) / 4) * 0.5
      : 0.5 + ((score - 5) / 5) * 0.5;
    return minRadius + normalized * (maxRadius - minRadius);
  };

  // Axis configuration (Values at top, Authenticity bottom-right, Horizon bottom-left)
  const axes = [
    { key: "values", angle: 270, letter: valuesLetter, score: valuesScore, name: "Values", left: "I", right: "F" },
    { key: "authenticity", angle: 30, letter: authLetter, score: authScore, name: "Authenticity", left: "S", right: "R" },
    { key: "horizon", angle: 150, letter: horizonLetter, score: horizonScore, name: "Horizon", left: "L", right: "C" },
  ];

  // Calculate data points for the polygon
  const dataPoints = axes.map(axis => {
    const radius = scoreToRadius(axis.score);
    const point = polarToCartesian(radius, axis.angle);
    return { ...axis, ...point };
  });

  // Create polygon path
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  // Ring radii for scale markers
  const ringScores = [1, 3, 5, 7, 10];
  const rings = ringScores.map(score => ({
    score,
    radius: scoreToRadius(score),
  }));

  // Colors
  const bgColor = "#fafafa";
  const ringColor = "rgba(0, 0, 0, 0.08)";
  const ringColorMid = "rgba(0, 0, 0, 0.15)";
  const axisColor = "rgba(0, 0, 0, 0.12)";
  const polygonFill = "rgba(251, 173, 37, 0.25)";
  const polygonStroke = "#FBAD25";
  const pointColor = "#FBAD25";
  const textMuted = "#888888";
  const textActive = "#c4880d";

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          borderRadius: 12,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: "absolute" }}
        >
          {/* Background rings */}
          {rings.map((ring) => (
            <circle
              key={ring.score}
              cx={center}
              cy={center}
              r={ring.radius}
              fill="none"
              stroke={ring.score === 5 ? ringColorMid : ringColor}
              strokeWidth={ring.score === 5 || ring.score === 10 ? 2 : 1}
            />
          ))}

          {/* Axis lines */}
          {axes.map((axis) => {
            const outer = polarToCartesian(maxRadius + 10, axis.angle);
            return (
              <line
                key={axis.key}
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke={axisColor}
                strokeWidth={1}
              />
            );
          })}

          {/* Filled polygon */}
          <polygon
            points={polygonPoints}
            fill={polygonFill}
            stroke={polygonStroke}
            strokeWidth={3}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {dataPoints.map((p) => (
            <g key={p.key}>
              <circle cx={p.x} cy={p.y} r={10} fill="rgba(251, 173, 37, 0.3)" />
              <circle cx={p.x} cy={p.y} r={7} fill={pointColor} stroke="#ffffff" strokeWidth={2} />
            </g>
          ))}

          {/* Center marker */}
          <circle cx={center} cy={center} r={3} fill={textMuted} />
        </svg>

        {/* Labels - positioned with absolute divs since SVG text doesn't work well in Satori */}
        {axes.map((axis) => {
          const labelPos = polarToCartesian(maxRadius + 45, axis.angle);
          const isActive = (side: string) => axis.letter === side;

          return (
            <div
              key={`label-${axis.key}`}
              style={{
                position: "absolute",
                left: labelPos.x - 50,
                top: labelPos.y - 25,
                width: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {axis.name}
              </span>
              <span style={{ fontSize: 13, marginTop: 2 }}>
                <span style={{ color: isActive(axis.left) ? textActive : "rgba(0,0,0,0.3)", fontWeight: isActive(axis.left) ? 700 : 400 }}>{axis.left}</span>
                <span style={{ color: "rgba(0,0,0,0.3)" }}> / </span>
                <span style={{ color: isActive(axis.right) ? textActive : "rgba(0,0,0,0.3)", fontWeight: isActive(axis.right) ? 700 : 400 }}>{axis.right}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: textActive, marginTop: 2 }}>
                {axis.letter}({axis.score})
              </span>
            </div>
          );
        })}
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
