"use client";

type ScaleQuestionProps = {
  id: string;
  label: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
};

export function ScaleQuestion({
  id,
  label,
  min = 1,
  max = 10,
  value,
  onChange,
}: ScaleQuestionProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
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
          value={value}
          onChange={handleSliderChange}
          className="rq-slider"
        />
        <div className="rq-scale-value">{value}</div>
      </div>
      <div className="rq-scale-labels">
        <span className="rq-scale-label-min">{min} = Lowest</span>
        <span className="rq-scale-label-center">5–6 = Neutral</span>
        <span className="rq-scale-label-max">{max} = Highest</span>
      </div>
    </div>
  );
}
