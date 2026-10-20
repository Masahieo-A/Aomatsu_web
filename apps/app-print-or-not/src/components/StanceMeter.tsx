"use client";
// 立場メーター（1=広めるべき … 5=制限すべき）。S1 と S6 で共通。

export const STANCE_LABELS = [
  { en: "Spread it", ja: "広めるべき" },
  { en: "Lean to spread", ja: "やや広めるべき" },
  { en: "Not sure", ja: "未決" },
  { en: "Lean to restrict", ja: "やや制限すべき" },
  { en: "Restrict it", ja: "制限すべき" },
];

export function stanceText(v: number | undefined): string {
  if (v === undefined) return "未回答";
  const l = STANCE_LABELS[v - 1];
  return `${v}：${l.en}（${l.ja}）`;
}

export default function StanceMeter({
  value,
  onChange,
  name,
  disabled,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">立場</legend>
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span className="text-pro">▲ Spread it</span>
        <span className="text-con">Restrict it ■</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {STANCE_LABELS.map((l, i) => {
          const v = i + 1;
          const checked = value === v;
          return (
            <label
              key={v}
              className={`flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-2 text-center text-xs leading-tight ${
                checked ? "border-accent bg-accent-dim font-bold" : "border-line bg-white"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={checked}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <span className="text-base font-bold">{v}</span>
              <span>{l.ja}</span>
              {checked && <span aria-hidden>✓</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
