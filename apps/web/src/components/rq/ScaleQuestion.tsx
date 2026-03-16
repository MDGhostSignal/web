"use client";

import { useState } from "react";

type ScaleQuestionProps = {
  id: string;
  label: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  value: number;
  noPreference: boolean;
  onChange: (value: number) => void;
  onNoPreferenceChange: (checked: boolean) => void;
};

export function ScaleQuestion({
  id,
  label,
  min = 1,
  max = 10,
  defaultValue = 5,
  value,
  noPreference,
  onChange,
  onNoPreferenceChange,
}: ScaleQuestionProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!noPreference) {
      onChange(Number(e.target.value));
    }
  };

  const handleNoPreferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onNoPreferenceChange(checked);
    if (checked) {
      onChange(5); // Set to neutral when NP is checked
    }
  };

  return (
    <div className="rq-question">
      <label htmlFor={id} className="rq-question-label">
        {label}
      </label>
      <div className="rq-scale">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={noPreference ? 5 : value}
          onChange={handleSliderChange}
          disabled={noPreference}
          className="rq-slider"
        />
        <div className="rq-scale-value">{noPreference ? "NP" : value}</div>
      </div>
      <div className="rq-scale-labels">
        <span className="rq-scale-label-min">{min} = Lowest</span>
        <span className="rq-scale-label-max">{max} = Highest</span>
      </div>
      <label className="rq-no-preference">
        <input
          type="checkbox"
          checked={noPreference}
          onChange={handleNoPreferenceChange}
        />
        <span>No preference</span>
      </label>
    </div>
  );
}
