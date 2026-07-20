"use client";

import { checkAllConflicts, findLongConsecutiveRuns } from "@/lib/schedule";
import { ExamMethod } from "@/lib/types";
import { formatDate } from "@/lib/format";

const MONTH_LABELS = ["10月", "11月", "12月", "1月", "2月", "3月"];

function seasonRange(methods: ExamMethod[]): { start: Date; end: Date } {
  const dates = methods.flatMap((m) => m.schedule?.examDates ?? []);
  if (dates.length === 0) {
    const now = new Date();
    return { start: now, end: now };
  }
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const d = new Date(min + "T00:00:00");
  const y = d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
  return { start: new Date(y, 9, 1), end: new Date(y + 1, 2, 31) };
}

function leftPercent(date: string, start: Date, end: Date): number {
  const d = new Date(date + "T00:00:00");
  const total = end.getTime() - start.getTime();
  return Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / total) * 100));
}

export default function ScheduleCalendar({ methods }: { methods: ExamMethod[] }) {
  if (methods.length === 0) {
    return <p className="text-sm text-zinc-400">方式を選択すると日程が表示されます。</p>;
  }
  const { start, end } = seasonRange(methods);
  const conflicts = checkAllConflicts(methods);
  const runs = findLongConsecutiveRuns(methods);
  const runDateSet = new Set(runs.flat());

  const conflictColorForDate = (method: ExamMethod, date: string): "red" | "yellow" | null => {
    let color: "red" | "yellow" | null = null;
    for (const c of conflicts) {
      if (c.methodA.id !== method.id && c.methodB.id !== method.id) continue;
      const involved = c.conflictPairs.some(([da, db]) => da === date || db === date);
      if (!involved) continue;
      if (c.fuzzyDays > 0 || c.avoidable) color = color === "red" ? "red" : "yellow";
      else color = "red";
    }
    return color;
  };

  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-3">
      <div className="relative ml-40 h-6 border-b border-zinc-300 text-xs text-zinc-500">
        {MONTH_LABELS.map((label, i) => (
          <span
            key={label}
            className="absolute -translate-x-1/2"
            style={{ left: `${(i / 6) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        {methods.map((m) => (
          <div key={m.id} className="flex items-center">
            <div className="w-40 shrink-0 truncate pr-2 text-xs text-zinc-600">
              {m.university} {m.methodName}
            </div>
            <div className="relative h-5 flex-1 border-l border-zinc-200">
              {(m.schedule?.examDates ?? []).map((d) => {
                const color = conflictColorForDate(m, d);
                const warn = runDateSet.has(d);
                return (
                  <div
                    key={d}
                    title={`${formatDate(d)}${warn ? "（連続受験3日超）" : ""}`}
                    className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                      color === "red"
                        ? "border-red-600 bg-red-500"
                        : color === "yellow"
                          ? "border-yellow-600 bg-yellow-400"
                          : "border-blue-500 bg-blue-300"
                    }`}
                    style={{ left: `${leftPercent(d, start, end)}%` }}
                  >
                    {warn && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px]">
                        ⚠
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
        <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 align-middle" /> 被り（回避不可）</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400 align-middle" /> 前年度実績・要確認 or 回避可能</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-300 align-middle" /> 被りなし</span>
        <span>⚠ 連続受験3日超</span>
      </div>

      {conflicts.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-zinc-600">
          {conflicts.map((c, i) => (
            <li key={i}>
              {c.methodA.university}「{c.methodA.methodName}」 × {c.methodB.university}「{c.methodB.methodName}」
              {c.fuzzyDays > 0 && "（前年度実績のため±3日を要確認）"}
              {c.avoidable && "（試験日選択により回避可能）"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
