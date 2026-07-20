"use client";

import { JudgeResult } from "@/lib/judge";
import { isEnrollFeePrepaid } from "@/lib/schedule";
import { ExamMethod, HEIGAN_POLICY_LABEL } from "@/lib/types";
import { formatDate, formatSubjects } from "@/lib/format";

function verdictLabel(v: JudgeResult): string {
  switch (v.verdict) {
    case "ok":
      return "○ 完全充足";
    case "range_mismatch":
      return "△ 範囲要確認";
    case "plus_one":
      return `△ +${v.addSubject}`;
    case "no_subject_exam":
      return "書類・面接型";
    case "ng":
      return "× 不可";
  }
}

export default function SummaryPrint({
  baseMethod,
  candidates,
  verdicts,
}: {
  baseMethod: ExamMethod;
  candidates: ExamMethod[];
  verdicts: Map<string, JudgeResult>;
}) {
  const total = [baseMethod, ...candidates].reduce((sum, m) => sum + (m.fee ?? 0), 0);

  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 print:border-0 print:p-0">
      <div className="mb-2 flex items-center justify-between print:hidden">
        <p className="text-sm text-zinc-500">面談サマリー（印刷用 / 併願校決定シートSTEP5に転記可）</p>
        <button
          onClick={() => window.print()}
          className="rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700"
        >
          印刷する
        </button>
      </div>

      <h2 className="text-lg font-bold">併願校検討サマリー</h2>
      <p className="text-sm text-zinc-600">
        第一志望・基準方式：{baseMethod.university} {baseMethod.faculty} {baseMethod.department !== "-" ? baseMethod.department : ""} / {baseMethod.methodName}
      </p>

      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-zinc-400 text-left">
            <th className="py-1 pr-2">大学</th>
            <th className="py-1 pr-2">方式</th>
            <th className="py-1 pr-2">併願可否</th>
            <th className="py-1 pr-2">科目判定</th>
            <th className="py-1 pr-2">科目</th>
            <th className="py-1 pr-2">試験日</th>
            <th className="py-1 pr-2">発表日</th>
            <th className="py-1 pr-2">手続締切</th>
            <th className="py-1 pr-2">検定料</th>
            <th className="py-1 pr-2">入学金先払い</th>
          </tr>
        </thead>
        <tbody>
          {[baseMethod, ...candidates].map((m) => {
            const v = verdicts.get(m.id);
            const prepaid = m.id !== baseMethod.id && isEnrollFeePrepaid(baseMethod, m);
            return (
              <tr key={m.id} className="border-b border-zinc-200">
                <td className="py-1 pr-2">{m.university}</td>
                <td className="py-1 pr-2">{m.methodName}</td>
                <td className="py-1 pr-2">{HEIGAN_POLICY_LABEL[m.heiganPolicy]}</td>
                <td className="py-1 pr-2">{m.id === baseMethod.id ? "基準" : v ? verdictLabel(v) : ""}</td>
                <td className="py-1 pr-2">{formatSubjects(m.subjects)}</td>
                <td className="py-1 pr-2">{m.schedule?.examDates.map(formatDate).join("・") ?? "未定"}</td>
                <td className="py-1 pr-2">{formatDate(m.schedule?.resultDate ?? null)}</td>
                <td className="py-1 pr-2">{formatDate(m.schedule?.enrollDeadline ?? null)}</td>
                <td className="py-1 pr-2">{m.fee ? `${m.fee.toLocaleString()}円` : "不明"}</td>
                <td className="py-1 pr-2">{prepaid ? "発生" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-2 text-right text-sm font-medium">検定料合計：{total.toLocaleString()}円</p>
      <p className="mt-4 text-[10px] text-zinc-400">
        本資料は要項の抜粋です。出願前に必ず要項原本を確認してください。
      </p>
    </div>
  );
}
