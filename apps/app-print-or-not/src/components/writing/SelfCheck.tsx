"use client";
// セルフチェック7項目。最後の「語数」だけは語数カウンタと連動する自動チェックで、手では変えられない。
export const MANUAL_CHECKS = [
  "立場が最初と最後で一致している",
  "理由が2つあり、それぞれに数字か具体例がある",
  "「だから何？」が書けている（事実を並べただけになっていない）",
  "感情論だけの理由がない",
  "反対意見に1回は触れて、答えている",
  "出典を少なくとも1つ明示している（例：According to a report by ...）",
];

interface Props {
  checks: boolean[];
  onToggle: (index: number, value: boolean) => void;
  wordLabel: string;
  wordOk: boolean;
}

export default function SelfCheck({ checks, onToggle, wordLabel, wordOk }: Props) {
  return (
    <ul className="space-y-1">
      {MANUAL_CHECKS.map((label, i) => (
        <li key={label}>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-base">
            <input
              type="checkbox"
              className="mt-1.5 h-5 w-5 shrink-0 accent-[#2d6a4f]"
              checked={checks[i] === true}
              onChange={(e) => onToggle(i, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        </li>
      ))}
      <li>
        <div className="flex min-h-11 items-start gap-3 py-2 text-base">
          <input
            type="checkbox"
            className="mt-1.5 h-5 w-5 shrink-0 accent-[#2d6a4f]"
            checked={wordOk}
            disabled
            readOnly
            aria-label="語数が目標範囲内（自動）"
          />
          <span>
            {wordLabel}
            <span className="muted ml-1">（自動）</span>
          </span>
        </div>
      </li>
    </ul>
  );
}
