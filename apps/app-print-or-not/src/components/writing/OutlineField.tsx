"use client";
// アウトライン1段分（見出し・何を書くかのヒント・メモ欄）

interface Props {
  label: string; // 英語の見出し
  labelJa: string; // 日本語の見出し
  guide: string; // この欄に何を書くかの日本語ヒント
  hint: string;
  memo: string;
  onMemo: (v: string) => void;
}

export default function OutlineField({ label, labelJa, guide, hint, memo, onMemo }: Props) {
  const id = `outline-${label.replace(/\W+/g, "-")}`;

  return (
    // 外側のカードの中で、欄どうしを罫線で区切る
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-1 text-base font-bold">
        {label}（{labelJa}）
      </h3>
      <p className="muted mb-2">{guide}</p>
      <label className="field-label" htmlFor={`${id}-memo`}>
        {hint}
      </label>
      <textarea id={`${id}-memo`} className="field" rows={2} value={memo} onChange={(e) => onMemo(e.target.value)} />
    </div>
  );
}
