// 日程被り判定（要件定義書 §8.2 準拠）

import { ExamMethod } from "./types";

export type ScheduleConflict = {
  methodA: ExamMethod;
  methodB: ExamMethod;
  fuzzyDays: 0 | 3;
  avoidable: boolean; // examDateSelectable な方式で、被らない組み合わせが存在する場合 true
  conflictPairs: [string, string][];
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function fuzzyOf(m: ExamMethod): 0 | 3 {
  return m.dataStatus === "carryover_2026" ? 3 : 0;
}

/** 2つの方式の試験日群を比較し、被りを判定する。どちらかがcarryoverなら±3日を黄色帯として扱う。 */
export function checkConflict(a: ExamMethod, b: ExamMethod): ScheduleConflict | null {
  if (!a.schedule || !b.schedule) return null;
  const fuzzyDays = Math.max(fuzzyOf(a), fuzzyOf(b)) as 0 | 3;

  const pairs: [string, string][] = [];
  const conflictPairs: [string, string][] = [];
  for (const da of a.schedule.examDates) {
    for (const db of b.schedule.examDates) {
      pairs.push([da, db]);
      if (Math.abs(daysBetween(da, db)) <= fuzzyDays) conflictPairs.push([da, db]);
    }
  }
  if (conflictPairs.length === 0) return null;

  const selectable = a.schedule.examDateSelectable || b.schedule.examDateSelectable;
  // 選択可能な方式は「全組み合わせが被る場合のみ回避不可」。固定日同士は被りがあれば即NG。
  const avoidable = selectable && conflictPairs.length < pairs.length;

  return { methodA: a, methodB: b, fuzzyDays, avoidable, conflictPairs };
}

/** 選択中の全方式の組み合わせについて被りを総当たりでチェックする。 */
export function checkAllConflicts(methods: ExamMethod[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < methods.length; i++) {
    for (let j = i + 1; j < methods.length; j++) {
      const c = checkConflict(methods[i], methods[j]);
      if (c) conflicts.push(c);
    }
  }
  return conflicts;
}

/** 連続受験日数が3日を超える並びを検出する（試験日の集合から）。 */
export function findLongConsecutiveRuns(methods: ExamMethod[]): string[][] {
  const allDates = Array.from(
    new Set(methods.flatMap((m) => m.schedule?.examDates ?? []))
  ).sort();

  const runs: string[][] = [];
  let current: string[] = [];
  for (const d of allDates) {
    if (current.length === 0) {
      current = [d];
    } else if (daysBetween(current[current.length - 1], d) === 1) {
      current.push(d);
    } else {
      if (current.length > 3) runs.push(current);
      current = [d];
    }
  }
  if (current.length > 3) runs.push(current);
  return runs;
}

/** 入学金先払い判定（§F5）：併願方式の手続締切 < 基準方式の合格発表日 */
export function isEnrollFeePrepaid(baseMethod: ExamMethod, candidate: ExamMethod): boolean {
  if (!baseMethod.schedule?.resultDate || !candidate.schedule?.enrollDeadline) return false;
  return daysBetween(baseMethod.schedule.resultDate, candidate.schedule.enrollDeadline) < 0;
}
