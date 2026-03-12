"use client";

type TextAreaProps = {
  id: string;
  label: string;
  placeholder?: string;
  rows?: number;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
};

export function TextArea({
  id,
  label,
  placeholder,
  rows = 8,
  value,
  onChange,
  helpText,
}: TextAreaProps) {
  return (
    <div className="rq-question">
      <label htmlFor={id} className="rq-question-label">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="rq-input rq-textarea"
      />
      {helpText && <div className="rq-help-text">{helpText}</div>}
    </div>
  );
}
