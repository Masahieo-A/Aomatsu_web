"use client";

import { ExamMethod, HEIGAN_POLICY_LABEL, METHOD_CATEGORY_LABEL } from "@/lib/types";
import { evidenceFor, formatDate, formatSubjects } from "@/lib/format";
import { Badge } from "./Badge";
import EvidenceButton from "./EvidenceButton";

export default function MethodCard({
  method,
  isBase,
  onSelectBase,
  rightSlot,
}: {
  method: ExamMethod;
  isBase?: boolean;
  onSelectBase?: () => void;
  rightSlot?: React.ReactNode;
}) {
  const heiganColor =
    method.heiganPolicy === "heigan_ok" ? "green" : method.heiganPolicy === "sengan" ? "red" : "zinc";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isBase ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color="blue">{METHOD_CATEGORY_LABEL[method.methodCategory]}</Badge>
        <Badge color={heiganColor}>{HEIGAN_POLICY_LABEL[method.heiganPolicy]}</Badge>
        <Badge color={method.dataStatus === "confirmed_2027" ? "green" : "yellow"}>
          {method.dataStatus === "confirmed_2027" ? "2027確定" : "2026実績(要確認)"}
        </Badge>
        <span className="ml-auto" />
        {rightSlot}
        {onSelectBase && (
          <button
            onClick={onSelectBase}
            className={`rounded px-2 py-1 text-xs font-medium print:hidden ${
              isBase
                ? "bg-blue-600 text-white"
                : "border border-blue-400 text-blue-600 hover:bg-blue-50"
            }`}
          >
            {isBase ? "基準方式に設定中" : "これを基準にする"}
          </button>
        )}
      </div>

      <p className="mt-2 font-semibold">{method.methodName}</p>

      <dl className="mt-2 grid grid-cols-[5em_1fr] gap-x-2 gap-y-1 text-sm">
        <dt className="text-zinc-500">科目</dt>
        <dd className="flex items-center gap-1">
          {formatSubjects(method.subjects)}
          <EvidenceButton evidence={evidenceFor(method.evidence, "subjects")} />
        </dd>

        <dt className="text-zinc-500">出願期間</dt>
        <dd className="flex items-center gap-1">
          {formatDate(method.schedule?.applicationStart ?? null)}〜
          {formatDate(method.schedule?.applicationEnd ?? null)}
          <EvidenceButton evidence={evidenceFor(method.evidence, "schedule.application")} />
        </dd>

        <dt className="text-zinc-500">試験日</dt>
        <dd className="flex items-center gap-1">
          {method.schedule?.examDates.map((d) => formatDate(d)).join("・") ?? "未定"}
          {method.schedule?.examDateSelectable && (
            <span className="text-xs text-zinc-400">（選択可）</span>
          )}
          <EvidenceButton evidence={evidenceFor(method.evidence, "schedule.examDates")} />
        </dd>

        <dt className="text-zinc-500">発表日</dt>
        <dd className="flex items-center gap-1">
          {formatDate(method.schedule?.resultDate ?? null)}
          <EvidenceButton evidence={evidenceFor(method.evidence, "schedule.resultDate")} />
        </dd>

        <dt className="text-zinc-500">手続締切</dt>
        <dd className="flex items-center gap-1">
          {formatDate(method.schedule?.enrollDeadline ?? null)}
          <EvidenceButton evidence={evidenceFor(method.evidence, "schedule.enrollDeadline")} />
        </dd>

        <dt className="text-zinc-500">検定料</dt>
        <dd className="flex items-center gap-1">
          {method.fee ? `${method.fee.toLocaleString()}円` : "不明"}
          {method.feeNote && <span className="text-xs text-zinc-400">（{method.feeNote}）</span>}
          <EvidenceButton evidence={evidenceFor(method.evidence, "fee")} />
        </dd>
      </dl>
    </div>
  );
}
