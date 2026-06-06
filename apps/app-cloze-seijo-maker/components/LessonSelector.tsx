"use client";

interface Props {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function LessonSelector({ label, options, value, onChange, disabled }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <label
        style={{
          fontSize: "0.85rem",
          fontWeight: 600,
          color: "var(--muted-foreground)",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          padding: "0.6rem 0.9rem",
          borderRadius: "0.5rem",
          border: "1.5px solid var(--border)",
          background: disabled ? "var(--muted)" : "#fff",
          color: disabled ? "var(--muted-foreground)" : "var(--foreground)",
          fontSize: "1rem",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
          paddingRight: "2.5rem",
          minWidth: "200px",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = "var(--app-accent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        <option value="">-- 選択してください --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
