"use client";

import { ALL_SUBJECTS, SubjectName } from "@/lib/types";

export type SubjectMode = "base" | "manual";

export type CandidateFilters = {
  facultyMatch: boolean; // 学部名が基準と一致する方式のみ
  departmentMatch: boolean; // 学科名が基準と一致する方式のみ
  okOnly: boolean; // ○完全充足のみ表示
};

export default function CandidateFilterPanel({
  subjectMode,
  onChangeSubjectMode,
  manualSubjects,
  onToggleManualSubject,
  filters,
  onChangeFilters,
  baseFaculty,
  baseDepartment,
}: {
  subjectMode: SubjectMode;
  onChangeSubjectMode: (mode: SubjectMode) => void;
  manualSubjects: Set<SubjectName>;
  onToggleManualSubject: (s: SubjectName) => void;
  filters: CandidateFilters;
  onChangeFilters: (f: CandidateFilters) => void;
  baseFaculty: string;
  baseDepartment: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-zinc-300 bg-white p-3 text-sm">
      <p className="mb-1 font-medium text-zinc-700">照合オプション</p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="subjectMode"
            checked={subjectMode === "base"}
            onChange={() => onChangeSubjectMode("base")}
          />
          基準方式の科目で照合
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="subjectMode"
            checked={subjectMode === "manual"}
            onChange={() => onChangeSubjectMode("manual")}
          />
          科目を手動で選択して照合
        </label>
      </div>

      {subjectMode === "manual" && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded border border-blue-200 bg-blue-50 p-2">
          {ALL_SUBJECTS.map((s) => (
            <label key={s} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={manualSubjects.has(s)}
                onChange={() => onToggleManualSubject(s)}
              />
              {s}
            </label>
          ))}
          {manualSubjects.size === 0 && (
            <span className="text-xs text-zinc-500">
              受験に使う科目をチェックしてください（例: 英語・国語・日本史）
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-2">
        <span className="text-xs text-zinc-500">絞り込み:</span>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={filters.facultyMatch}
            onChange={(e) => onChangeFilters({ ...filters, facultyMatch: e.target.checked })}
          />
          学部が一致（{baseFaculty}）
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={filters.departmentMatch}
            disabled={baseDepartment === "-"}
            onChange={(e) => onChangeFilters({ ...filters, departmentMatch: e.target.checked })}
          />
          学科が一致（{baseDepartment === "-" ? "学部一括のため指定不可" : baseDepartment}）
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={filters.okOnly}
            onChange={(e) => onChangeFilters({ ...filters, okOnly: e.target.checked })}
          />
          ○完全充足のみ表示
        </label>
      </div>
    </div>
  );
}
