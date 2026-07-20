// 科目充足判定（要件定義書 §8.1 準拠）

import { ALL_SUBJECTS, ExamMethod, SubjectCode, SubjectName } from "./types";

export type RangeMismatch = {
  subject: SubjectName;
  baseRange?: string;
  targetRange?: string;
};

export type JudgeResult =
  | { verdict: "ok" }
  | { verdict: "range_mismatch"; mismatches: RangeMismatch[] }
  | { verdict: "plus_one"; addSubject: SubjectName }
  | { verdict: "ng" }
  | { verdict: "no_subject_exam" }; // nonAcademicのみ（書類・面接型）

/** groups から pick 個ずつ、同一科目を二重使用せずに選べるか（全探索） */
function canSatisfyChoiceGroups(
  groups: { from: SubjectCode[]; pick: number }[],
  have: Set<SubjectName>,
  requiredNames: SubjectName[]
): boolean {
  const requiredSet = new Set(requiredNames);

  function combinations<T>(pool: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (pool.length < k) return [];
    const [head, ...rest] = pool;
    const withHead = combinations(rest, k - 1).map((c) => [head, ...c]);
    const withoutHead = combinations(rest, k);
    return [...withHead, ...withoutHead];
  }

  function backtrack(i: number, usedInChoice: Set<SubjectName>): boolean {
    if (i === groups.length) return true;
    const group = groups[i];
    const candidates = Array.from(
      new Set(
        group.from
          .map((c) => c.subject)
          .filter((s) => have.has(s) && !requiredSet.has(s) && !usedInChoice.has(s))
      )
    );
    for (const combo of combinations(candidates, group.pick)) {
      const newUsed = new Set(usedInChoice);
      combo.forEach((s) => newUsed.add(s));
      if (backtrack(i + 1, newUsed)) return true;
    }
    return false;
  }

  return backtrack(0, new Set());
}

function rangeMismatches(base: SubjectCode[], method: ExamMethod): RangeMismatch[] {
  const baseBySubject = new Map(base.map((c) => [c.subject, c.range]));
  const mismatches: RangeMismatch[] = [];
  const targetCodes = [
    ...(method.subjects?.required ?? []),
    ...(method.subjects?.choiceGroups.flatMap((g) => g.from) ?? []),
  ];
  for (const code of targetCodes) {
    const baseRange = baseBySubject.get(code.subject);
    if (baseRange && code.range && baseRange !== code.range) {
      mismatches.push({ subject: code.subject, baseRange, targetRange: code.range });
    }
  }
  return mismatches;
}

/**
 * 基準方式の保有科目集合(range込み)から、対象方式が受験可能か判定する。
 * subjects が null（要確認）の場合は呼び出し側でハンドリングすること。
 */
export function judgeMethod(base: SubjectCode[], method: ExamMethod): JudgeResult {
  if (!method.subjects) return { verdict: "ng" };
  if (method.subjects.totalCount === 0 && method.subjects.required.length === 0 && method.subjects.choiceGroups.length === 0) {
    return { verdict: "no_subject_exam" };
  }

  const S = new Set(base.map((c) => c.subject));
  const requiredNames = method.subjects.required.map((r) => r.subject);

  const satisfiable = (extra: SubjectName | null): boolean => {
    const have = extra ? new Set([...S, extra]) : new Set(S);
    if (!requiredNames.every((r) => have.has(r))) return false;
    return canSatisfyChoiceGroups(method.subjects!.choiceGroups, have, requiredNames);
  };

  if (satisfiable(null)) {
    const mismatches = rangeMismatches(base, method);
    if (mismatches.length > 0) return { verdict: "range_mismatch", mismatches };
    return { verdict: "ok" };
  }

  for (const s of ALL_SUBJECTS) {
    if (!S.has(s) && satisfiable(s)) return { verdict: "plus_one", addSubject: s };
  }

  return { verdict: "ng" };
}
