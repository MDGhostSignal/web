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
    <fieldset className="rq-question rq-question-choice">
      <legend className="rq-question-label">{label}</legend>
      <div className="rq-choices" role="radiogroup">
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
    </fieldset>
  );
}
