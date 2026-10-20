// 立場分布（前後）の横棒グラフ。外部ライブラリを使わず div の幅で描く。生徒画面・教員画面で共通。
import { STANCE_LABELS } from "./StanceMeter";

export default function StanceChart({ before, after }: { before: number[]; after: number[] }) {
  const max = Math.max(1, ...before, ...after);
  const totalB = before.reduce((a, b) => a + b, 0);
  const totalA = after.reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-5 rounded-sm border border-line bg-[#d6d3d1]" /> 読む前（{totalB}人）
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-5 rounded-sm bg-accent" /> 読んだ後（{totalA}人）
        </span>
      </div>
      {STANCE_LABELS.map((l, i) => (
        <div key={i} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-xs">
          <span>
            {i + 1} {l.ja}
          </span>
          <div className="space-y-1">
            <Bar value={before[i] ?? 0} max={max} className="border border-line bg-[#d6d3d1]" label="前" />
            <Bar value={after[i] ?? 0} max={max} className="bg-accent" label="後" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bar({ value, max, className, label }: { value: number; max: number; className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1">
        <div className={`h-3 rounded-sm ${className}`} style={{ width: `${(value / max) * 100}%`, minWidth: value ? 4 : 0 }} />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums">
        {label} {value}
      </span>
    </div>
  );
}
