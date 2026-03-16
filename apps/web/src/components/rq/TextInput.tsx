"use client";

type TextInputProps = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "url";
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
};

export function TextInput({
  id,
  label,
  placeholder,
  required = false,
  type = "text",
  value,
  onChange,
  helpText,
}: TextInputProps) {
  return (
    <div className="rq-question">
      <label htmlFor={id} className="rq-question-label">
        {label}
        {!required && <span className="rq-optional"> (optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rq-input"
      />
      {helpText && <p className="rq-help-text">{helpText}</p>}
    </div>
  );
}
