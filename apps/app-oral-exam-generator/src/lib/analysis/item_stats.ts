import type { Question, Result, Submission } from "@/types";

/**
 * アイテム分析（ver2.md §6.3・Phase 3 簡易ダッシュボード用）。
 *
 * 本システムでは問いは生徒ごとに固有のため、個別の問いではなく
 * **問いの型**を分析単位とする（不良指標を示した型・パターンを特定して
 * プロンプト改訂へフィードバックする、という運用のための集計）。
 */

export interface TypeStat {
  type: number;
  scored: number;
  correct: number;
  /** 正答率（項目困難度）。採点データが無ければ null */
  correct_rate: number | null;
  /** 弁別指数＝上位群と下位群の正答率差。生徒4人未満は null */
  discrimination: number | null;
  flags: string[];
}

export interface StudentStat {
  student_label: string;
  scored: number;
  correct: number;
  rate: number | null;
}

export interface ItemAnalysis {
  overall: { scored: number; correct: number; correct_rate: number | null };
  perType: TypeStat[];
  perStudent: StudentStat[];
}

const rate = (correct: number, scored: number): number | null =>
  scored > 0 ? correct / scored : null;

export function computeItemAnalysis(input: {
  submissions: Submission[];
  questions: Question[];
  results: Result[];
}): ItemAnalysis {
  const { submissions, questions, results } = input;

  const questionById = new Map(questions.map((q) => [q.question_id, q]));
  const labelBySubmission = new Map(
    submissions.map((s) => [s.submission_id, s.student_label])
  );

  // 生徒別集計
  const byStudent = new Map<string, { scored: number; correct: number }>();
  // (生徒, 型) 別集計
  const byStudentType = new Map<string, Map<number, { scored: number; correct: number }>>();

  for (const r of results) {
    const q = questionById.get(r.question_id);
    if (!q) continue;
    const label = labelBySubmission.get(q.submission_id) ?? r.student_label;

    const s = byStudent.get(label) ?? { scored: 0, correct: 0 };
    s.scored++;
    s.correct += r.score;
    byStudent.set(label, s);

    const typeMap = byStudentType.get(label) ?? new Map();
    const t = typeMap.get(q.type) ?? { scored: 0, correct: 0 };
    t.scored++;
    t.correct += r.score;
    typeMap.set(q.type, t);
    byStudentType.set(label, typeMap);
  }

  const perStudent: StudentStat[] = [...byStudent.entries()]
    .map(([student_label, s]) => ({
      student_label,
      scored: s.scored,
      correct: s.correct,
      rate: rate(s.correct, s.scored),
    }))
    .sort((a, b) => a.student_label.localeCompare(b.student_label));

  // 上位群・下位群（総合正答率の中央で分割。4人以上で有効）
  const ranked = perStudent
    .filter((s) => s.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const groupSize = Math.floor(ranked.length / 2);
  const upper = new Set(ranked.slice(0, groupSize).map((s) => s.student_label));
  const lower = new Set(
    ranked.slice(ranked.length - groupSize).map((s) => s.student_label)
  );
  const canDiscriminate = ranked.length >= 4;

  // 型別集計
  const perType: TypeStat[] = [];
  for (const type of [1, 2, 3, 4, 5]) {
    let scored = 0;
    let correct = 0;
    const group = { upper: { scored: 0, correct: 0 }, lower: { scored: 0, correct: 0 } };
    for (const [label, typeMap] of byStudentType) {
      const t = typeMap.get(type);
      if (!t) continue;
      scored += t.scored;
      correct += t.correct;
      if (upper.has(label)) {
        group.upper.scored += t.scored;
        group.upper.correct += t.correct;
      }
      if (lower.has(label)) {
        group.lower.scored += t.scored;
        group.lower.correct += t.correct;
      }
    }
    const correct_rate = rate(correct, scored);
    let discrimination: number | null = null;
    if (
      canDiscriminate &&
      group.upper.scored > 0 &&
      group.lower.scored > 0
    ) {
      discrimination =
        (group.upper.correct / group.upper.scored) -
        (group.lower.correct / group.lower.scored);
    }

    // 不良指標のフラグ（ver2.md §6.3 / §10）
    const flags: string[] = [];
    if (correct_rate !== null && scored >= 5) {
      if (correct_rate > 0.95) flags.push("易しすぎ（>0.95：弁別せず）");
      if (correct_rate < 0.2) flags.push("難しすぎ（<0.2：本人でも解けない疑い）");
    }
    if (discrimination !== null && discrimination < 0.1) {
      flags.push("弁別指数が低い（<0.1）");
    }

    perType.push({ type, scored, correct, correct_rate, discrimination, flags });
  }

  const totalScored = perStudent.reduce((a, s) => a + s.scored, 0);
  const totalCorrect = perStudent.reduce((a, s) => a + s.correct, 0);

  return {
    overall: {
      scored: totalScored,
      correct: totalCorrect,
      correct_rate: rate(totalCorrect, totalScored),
    },
    perType,
    perStudent,
  };
}
