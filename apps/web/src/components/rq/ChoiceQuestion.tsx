"use client";

type ChoiceQuestionProps = {
  id: string;
  label: string;
  options: string[];
  allowNoPreference?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function ChoiceQuestion({
  id,
  label,
  options,
  allowNoPreference = false,
  value,
  onChange,
}: ChoiceQuestionProps) {
  const allOptions = allowNoPreference ? [...options, "No preference"] : options;

  return (
    <div className="rq-question">
      <label className="rq-question-label">{label}</label>
      <div className="rq-choices">
        {allOptions.map((option) => (
          <label key={option} className="rq-choice-label">
            <input
              type="radio"
              name={id}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
