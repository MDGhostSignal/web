"use client";

type TextInputProps = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "url";
  value: string;
  onChange: (value: string) => void;
};

export function TextInput({
  id,
  label,
  placeholder,
  required = false,
  type = "text",
  value,
  onChange,
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
    </div>
  );
}
