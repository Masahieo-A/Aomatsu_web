"use client";

import { useMemo, useState } from "react";
import {
  departmentsOf,
  examMethods,
  facultiesOf,
  methodsFor,
  methodsOfUniversity,
  universities,
} from "@/lib/data";
import { ChoiceSelections, defaultChoiceSelections, resolveBaseSubjects } from "@/lib/baseSubjects";
import { judgeMethod } from "@/lib/judge";
import { ExamMethod, SubjectCode, SubjectName } from "@/lib/types";
import MethodCard from "@/components/MethodCard";
import BaseSubjectPanel from "@/components/BaseSubjectPanel";
import CandidateResult from "@/components/CandidateResult";
import CandidateFilterPanel, {
  CandidateFilters,
  SubjectMode,
} from "@/components/CandidateFilterPanel";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import CostView from "@/components/CostView";
import SummaryPrint from "@/components/SummaryPrint";

export default function Home() {
  const univList = universities();

  // F1: 第一志望ビュー選択
  const [university, setUniversity] = useState(univList[0] ?? "");
  const facultyList = useMemo(() => facultiesOf(university), [university]);
  const [faculty, setFaculty] = useState(facultyList[0] ?? "");
  const departmentList = useMemo(() => departmentsOf(university, faculty), [university, faculty]);
  const [department, setDepartment] = useState(departmentList[0] ?? "");
  const methods = useMemo(
    () => methodsFor(university, faculty, department),
    [university, faculty, department]
  );

  // F2: 基準方式
  const [baseMethodId, setBaseMethodId] = useState<string | null>(null);
  const baseMethod: ExamMethod | null = examMethods.find((m) => m.id === baseMethodId) ?? null;
  const [choiceSelections, setChoiceSelections] = useState<ChoiceSelections>({});
  const baseSubjects = useMemo(
    () => resolveBaseSubjects(baseMethod, choiceSelections),
    [baseMethod, choiceSelections]
  );

  function selectAsBase(m: ExamMethod) {
    setBaseMethodId(m.id);
    setChoiceSelections(defaultChoiceSelections(m));
  }

  // F3: 併願候補
  const [candidateUnivs, setCandidateUnivs] = useState<string[]>([]);
  const candidateMethods = useMemo(
    () => candidateUnivs.flatMap((u) => methodsOfUniversity(u)),
    [candidateUnivs]
  );

  // 照合オプション: 科目の指定方法（基準方式から / 手動チェック）と絞り込み
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("base");
  const [manualSubjects, setManualSubjects] = useState<Set<SubjectName>>(new Set());
  const [filters, setFilters] = useState<CandidateFilters>({
    facultyMatch: false,
    departmentMatch: false,
    okOnly: false,
  });

  const matchingSubjects: SubjectCode[] = useMemo(() => {
    if (subjectMode === "manual") {
      return Array.from(manualSubjects).map((s) => ({ subject: s }));
    }
    return baseSubjects;
  }, [subjectMode, manualSubjects, baseSubjects]);

  const verdicts = useMemo(() => {
    const map = new Map();
    if (baseMethod) {
      candidateMethods.forEach((m) => map.set(m.id, judgeMethod(matchingSubjects, m)));
    }
    return map;
  }, [baseMethod, matchingSubjects, candidateMethods]);

  const visibleCandidates = useMemo(() => {
    if (!baseMethod) return candidateMethods;
    return candidateMethods.filter((m) => {
      if (filters.facultyMatch && m.faculty !== baseMethod.faculty) return false;
      if (filters.departmentMatch && m.department !== baseMethod.department) return false;
      if (filters.okOnly && verdicts.get(m.id)?.verdict !== "ok") return false;
      return true;
    });
  }, [candidateMethods, baseMethod, filters, verdicts]);

  // F4/F5/F6: 選択中の方式（チェックボックスで日程・費用比較に含める候補を絞る）
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
  function toggleSelected(id: string) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const selectedCandidates = candidateMethods.filter((m) => selectedCandidateIds.has(m.id));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-4 pb-16 print:p-0">
      <header className="print:hidden">
        <h1 className="text-xl font-bold text-[#2d6a4f]">併願照合アプリ（HeiganNavi）</h1>
        <p className="text-sm text-[#6b645c]">第一志望と併願候補の科目充足・日程被り・入学金先払いを照合します。</p>
      </header>

      {/* F1: 第一志望ビュー */}
      <section className="print:hidden">
        <h2 className="mb-2 font-semibold">1. 第一志望を選択</h2>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            value={university}
            onChange={(e) => {
              const u = e.target.value;
              setUniversity(u);
              const fl = facultiesOf(u);
              setFaculty(fl[0] ?? "");
              const dl = departmentsOf(u, fl[0] ?? "");
              setDepartment(dl[0] ?? "");
            }}
          >
            {univList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            value={faculty}
            onChange={(e) => {
              const f = e.target.value;
              setFaculty(f);
              const dl = departmentsOf(university, f);
              setDepartment(dl[0] ?? "");
            }}
          >
            {facultyList.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {departmentList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 space-y-2">
          {methods.length === 0 && (
            <p className="text-sm text-zinc-400">この学科のデータはまだありません。</p>
          )}
          {methods.map((m) => (
            <MethodCard
              key={m.id}
              method={m}
              isBase={m.id === baseMethodId}
              onSelectBase={() => selectAsBase(m)}
            />
          ))}
        </div>
      </section>

      {/* F2 + F3 */}
      {baseMethod && (
        <section className="print:hidden">
          <h2 className="mb-2 font-semibold">2. 基準方式の科目 / 3. 併願候補の科目照合</h2>
          <BaseSubjectPanel
            method={baseMethod}
            choiceSelections={choiceSelections}
            onChangeChoice={(idx, subj: SubjectName) =>
              setChoiceSelections((prev) => ({ ...prev, [idx]: [subj] }))
            }
          />

          <CandidateFilterPanel
            subjectMode={subjectMode}
            onChangeSubjectMode={setSubjectMode}
            manualSubjects={manualSubjects}
            onToggleManualSubject={(s) =>
              setManualSubjects((prev) => {
                const next = new Set(prev);
                if (next.has(s)) next.delete(s);
                else next.add(s);
                return next;
              })
            }
            filters={filters}
            onChangeFilters={setFilters}
            baseFaculty={baseMethod.faculty}
            baseDepartment={baseMethod.department}
          />

          <div className="mt-3">
            <p className="mb-1 text-sm text-zinc-500">併願候補の大学を選択（複数可）</p>
            <div className="flex flex-wrap gap-2">
              {univList
                .filter((u) => u !== university)
                .map((u) => (
                  <label key={u} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={candidateUnivs.includes(u)}
                      onChange={(e) =>
                        setCandidateUnivs((prev) =>
                          e.target.checked ? [...prev, u] : prev.filter((x) => x !== u)
                        )
                      }
                    />
                    {u}
                  </label>
                ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {candidateMethods.length > 0 && (
              <p className="text-xs text-zinc-400">
                {visibleCandidates.length} / {candidateMethods.length} 方式を表示中
                {subjectMode === "manual" && manualSubjects.size > 0 && (
                  <>（手動選択: {Array.from(manualSubjects).join("・")}で照合）</>
                )}
              </p>
            )}
            {visibleCandidates.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-4"
                  checked={selectedCandidateIds.has(m.id)}
                  onChange={() => toggleSelected(m.id)}
                  title="日程・費用比較に含める"
                />
                <div className="flex-1">
                  <CandidateResult method={m} verdict={verdicts.get(m.id)!} />
                </div>
              </div>
            ))}
            {candidateUnivs.length > 0 && candidateMethods.length === 0 && (
              <p className="text-sm text-zinc-400">選択した大学の入試方式データがまだありません。</p>
            )}
            {candidateMethods.length > 0 && visibleCandidates.length === 0 && (
              <p className="text-sm text-zinc-400">
                絞り込み条件に合う方式がありません。条件を緩めてください。
              </p>
            )}
          </div>
        </section>
      )}

      {/* F4: 日程照合 */}
      {baseMethod && (
        <section className="print:hidden">
          <h2 className="mb-2 font-semibold">4. 日程照合（比較対象にチェックした方式のみ）</h2>
          <ScheduleCalendar methods={[baseMethod, ...selectedCandidates]} />
        </section>
      )}

      {/* F5: 費用ビュー */}
      {baseMethod && (
        <section className="print:hidden">
          <h2 className="mb-2 font-semibold">5. 入学金・費用</h2>
          <CostView baseMethod={baseMethod} candidates={selectedCandidates} />
        </section>
      )}

      {/* F6: 面談サマリー印刷 */}
      {baseMethod && (
        <section>
          <h2 className="mb-2 font-semibold print:hidden">6. 面談サマリー</h2>
          <SummaryPrint baseMethod={baseMethod} candidates={selectedCandidates} verdicts={verdicts} />
        </section>
      )}
    </main>
  );
}
