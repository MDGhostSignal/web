import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Generates an RQ radar chart as a PNG image
 * Uses pure HTML/CSS for maximum compatibility with Satori
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
  const maxRadius = 140;
  const minRadius = 20;

  // Convert polar to cartesian
  const polarToCartesian = (r: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad)
    };
  };

  // Score to radius (1-10 scale)
  const scoreToRadius = (score: number) => {
    const normalized = (score - 1) / 9;
    return minRadius + normalized * (maxRadius - minRadius);
  };

  // Axis angles: Values at top (270°), Authenticity bottom-right (30°), Horizon bottom-left (150°)
  const valuesPos = polarToCartesian(scoreToRadius(valuesScore), 270);
  const authPos = polarToCartesian(scoreToRadius(authScore), 30);
  const horizonPos = polarToCartesian(scoreToRadius(horizonScore), 150);

  // Colors
  const accentColor = "#FBAD25";
  const activeTextColor = "#c4880d";
  const mutedColor = "#888888";
  const inactiveColor = "rgba(0,0,0,0.3)";

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          borderRadius: 12,
          position: "relative",
        }}
      >
        {/* Center rings - using borders */}
        <div
          style={{
            position: "absolute",
            width: maxRadius * 2,
            height: maxRadius * 2,
            borderRadius: "50%",
            border: "2px solid rgba(0,0,0,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: maxRadius * 1.4,
            height: maxRadius * 1.4,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: maxRadius,
            height: maxRadius,
            borderRadius: "50%",
            border: "2px solid rgba(0,0,0,0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: maxRadius * 0.5,
            height: maxRadius * 0.5,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />

        {/* Center dot */}
        <div
          style={{
            position: "absolute",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: mutedColor,
          }}
        />

        {/* Triangle polygon area - using SVG for the polygon only */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: "absolute" }}
        >
          <polygon
            points={`${valuesPos.x},${valuesPos.y} ${authPos.x},${authPos.y} ${horizonPos.x},${horizonPos.y}`}
            fill="rgba(251, 173, 37, 0.25)"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>

        {/* Data points */}
        <div
          style={{
            position: "absolute",
            left: valuesPos.x - 10,
            top: valuesPos.y - 10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: accentColor,
            border: "3px solid white",
            boxShadow: "0 2px 8px rgba(251, 173, 37, 0.5)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: authPos.x - 10,
            top: authPos.y - 10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: accentColor,
            border: "3px solid white",
            boxShadow: "0 2px 8px rgba(251, 173, 37, 0.5)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: horizonPos.x - 10,
            top: horizonPos.y - 10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: accentColor,
            border: "3px solid white",
            boxShadow: "0 2px 8px rgba(251, 173, 37, 0.5)",
          }}
        />

        {/* Values Label (top) - centered horizontally */}
        <div
          style={{
            position: "absolute",
            left: center - 60,
            top: 10,
            width: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: mutedColor, textTransform: "uppercase" }}>
            Values
          </span>
          <span style={{ fontSize: 14, marginTop: 2, display: "flex" }}>
            <span style={{ color: valuesLetter === "I" ? activeTextColor : inactiveColor, fontWeight: valuesLetter === "I" ? 700 : 400 }}>I</span>
            <span style={{ color: inactiveColor, margin: "0 4px" }}>/</span>
            <span style={{ color: valuesLetter === "F" ? activeTextColor : inactiveColor, fontWeight: valuesLetter === "F" ? 700 : 400 }}>F</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: activeTextColor, marginTop: 2 }}>
            {valuesLetter}({valuesScore})
          </span>
        </div>

        {/* Authenticity Label (bottom-right) */}
        <div
          style={{
            position: "absolute",
            left: size - 130,
            top: size - 80,
            width: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: mutedColor, textTransform: "uppercase" }}>
            Authenticity
          </span>
          <span style={{ fontSize: 14, marginTop: 2, display: "flex" }}>
            <span style={{ color: authLetter === "S" ? activeTextColor : inactiveColor, fontWeight: authLetter === "S" ? 700 : 400 }}>S</span>
            <span style={{ color: inactiveColor, margin: "0 4px" }}>/</span>
            <span style={{ color: authLetter === "R" ? activeTextColor : inactiveColor, fontWeight: authLetter === "R" ? 700 : 400 }}>R</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: activeTextColor, marginTop: 2 }}>
            {authLetter}({authScore})
          </span>
        </div>

        {/* Horizon Label (bottom-left) */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: size - 80,
            width: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: mutedColor, textTransform: "uppercase" }}>
            Horizon
          </span>
          <span style={{ fontSize: 14, marginTop: 2, display: "flex" }}>
            <span style={{ color: horizonLetter === "L" ? activeTextColor : inactiveColor, fontWeight: horizonLetter === "L" ? 700 : 400 }}>L</span>
            <span style={{ color: inactiveColor, margin: "0 4px" }}>/</span>
            <span style={{ color: horizonLetter === "C" ? activeTextColor : inactiveColor, fontWeight: horizonLetter === "C" ? 700 : 400 }}>C</span>
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: activeTextColor, marginTop: 2 }}>
            {horizonLetter}({horizonScore})
          </span>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
