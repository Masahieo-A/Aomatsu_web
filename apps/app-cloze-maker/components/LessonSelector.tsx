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
      <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted-foreground)" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          padding: "0.6rem 0.85rem",
          borderRadius: "0.5rem",
          border: "1.5px solid var(--border)",
          background: disabled ? "var(--muted)" : "#fff",
          fontSize: "0.95rem",
          color: "var(--foreground)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          width: "100%",
        }}
      >
        <option value="">選択してください</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
