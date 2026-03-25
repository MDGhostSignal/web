"use client";

import { useState } from "react";
import type { RQResult } from "@/lib/rq/scoring";
import { AXES, SCORE_BANDS } from "@/lib/rq/constants";
import { RQRadarChart } from "./RQRadarChart";
import "./RQResultsGraph.css";

type RQResultsGraphProps = {
  result: RQResult;
};

type AxisKey = "values" | "authenticity" | "horizon";

function getScoreBand(score: number): keyof typeof SCORE_BANDS {
  // Bands: 1-3 (light), 4-5 (balanced), 6-10 (strong)
  if (score <= 3) return "light";
  if (score <= 5) return "balanced";
  return "strong";
}

function AxisBarVisualization({
  leftLabel,
  rightLabel,
  score,
  letter,
  rightLetter,
}: {
  leftLabel: string;
  rightLabel: string;
  score: number;
  letter: string;
  rightLetter: string;
}) {
  // Calculate position on the 1-10 scale with 5 at exact center (50%)
  // Scores 1-5 map to 0-50%, scores 5-10 map to 50-100%
  const position = score <= 5
    ? ((score - 1) / 4) * 50
    : 50 + ((score - 5) / 5) * 50;
  const isOnRight = letter === rightLetter;

  return (
    <div className="rq-axis-bar">
      <div className="rq-axis-bar-spectrum">
        <span className={`rq-axis-bar-label ${!isOnRight ? "active" : ""}`}>
          {leftLabel}
        </span>

        <div className="rq-axis-bar-track">
          <div className="rq-axis-bar-track-bg">
            {/* Center marker */}
            <div className="rq-axis-bar-center" />

            {/* Position indicator */}
            <div
              className="rq-axis-bar-indicator"
              style={{ left: `${position}%` }}
            >
              <div className="rq-axis-bar-dot" />
            </div>

            {/* Fill from center to position */}
            <div
              className="rq-axis-bar-fill"
              style={{
                left: position < 50 ? `${position}%` : "50%",
                width: `${Math.abs(position - 50)}%`,
              }}
            />
          </div>

          {/* Scale markers */}
          <div className="rq-axis-bar-scale">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <span className={`rq-axis-bar-label ${isOnRight ? "active" : ""}`}>
          {rightLabel}
        </span>
      </div>
    </div>
  );
}

function AxisDetailCard({
  axisKey,
  letter,
  score,
  profile,
  isExpanded,
  onToggle,
}: {
  axisKey: AxisKey;
  letter: string;
  score: number;
  profile: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const axis = AXES[axisKey];
  const band = getScoreBand(score);
  const bandInfo = SCORE_BANDS[band];

  return (
    <div className="rq-axis-card">
      <button
        type="button"
        className={`rq-axis-card-header ${isExpanded ? "expanded" : ""}`}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="rq-axis-card-info">
          <h3 className="rq-axis-card-name">{axis.name}</h3>
          <div className="rq-axis-card-meta">
            <span className={`rq-axis-badge rq-axis-badge-${band}`}>
              {letter}({score})
            </span>
            <span className={`rq-axis-strength-badge rq-axis-strength-${band}`}>
              {bandInfo.label}
            </span>
          </div>
        </div>
        <span className="rq-axis-expand-icon" aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className="rq-axis-card-content">
          {/* Bar visualization */}
          <AxisBarVisualization
            leftLabel={axis.leftLabel}
            rightLabel={axis.rightLabel}
            score={score}
            letter={letter}
            rightLetter={axis.rightLetter}
          />

          <p className="rq-axis-description">{axis.description}</p>
          <p className="rq-axis-interpretation">{axis.interpretationNote}</p>
          <div className="rq-axis-profile">
            <h4>Your Profile</h4>
            <p>{profile}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function RQResultsGraph({ result }: RQResultsGraphProps) {
  const [expandedAxes, setExpandedAxes] = useState<Record<AxisKey, boolean>>({
    values: false,
    authenticity: false,
    horizon: false,
  });

  const toggleAxis = (axis: AxisKey) => {
    setExpandedAxes((prev) => ({
      ...prev,
      [axis]: !prev[axis],
    }));
  };

  const expandAll = () => {
    const allExpanded = Object.values(expandedAxes).every(Boolean);
    setExpandedAxes({
      values: !allExpanded,
      authenticity: !allExpanded,
      horizon: !allExpanded,
    });
  };

  return (
    <div className="rq-results-graph">
      <div className="rq-graph-header">
        <h2 className="rq-graph-title">Your Signal Profile</h2>
        <p className="rq-graph-subtitle">
          Your position on each axis—and how strongly your signal comes through.
        </p>
      </div>

      {/* Radar Chart Visualization */}
      <RQRadarChart result={result} />

      {/* Expandable Detail Cards */}
      <div className="rq-graph-details-section">
        <div className="rq-graph-details-header">
          <h3 className="rq-graph-details-title">What Your Profile Means:</h3>
          <button
            type="button"
            className="rq-graph-expand-all"
            onClick={expandAll}
          >
            {Object.values(expandedAxes).every(Boolean) ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <div className="rq-graph-detail-cards">
          <AxisDetailCard
            axisKey="values"
            letter={result.details.values.letter}
            score={result.details.values.score}
            profile={result.profile.values}
            isExpanded={expandedAxes.values}
            onToggle={() => toggleAxis("values")}
          />

          <AxisDetailCard
            axisKey="authenticity"
            letter={result.details.authenticity.letter}
            score={result.details.authenticity.score}
            profile={result.profile.authenticity}
            isExpanded={expandedAxes.authenticity}
            onToggle={() => toggleAxis("authenticity")}
          />

          <AxisDetailCard
            axisKey="horizon"
            letter={result.details.horizon.letter}
            score={result.details.horizon.score}
            profile={result.profile.horizon}
            isExpanded={expandedAxes.horizon}
            onToggle={() => toggleAxis("horizon")}
          />
        </div>
      </div>
    </div>
  );
}
