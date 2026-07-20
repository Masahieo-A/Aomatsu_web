import { describe, it, expect } from "vitest";
import { computeItemAnalysis } from "./item_stats";
import type { Question, Result, Submission } from "@/types";

// 4人の生徒 × 型1・型3 各1問のミニデータ
function makeData() {
  const submissions = ["A", "B", "C", "D"].map(
    (label, i) =>
      ({
        submission_id: `s${i}`,
        assignment_id: "a1",
        student_label: label,
        text: "dummy",
        status: "approved",
        analysis: null,
      }) as Submission
  );
  const questions: Question[] = [];
  const results: Result[] = [];
  // 型1は全員正解（易しすぎ・弁別なし）、型3は上位2人だけ正解（弁別あり）
  const type3Correct = new Set(["A", "B"]);
  // 総合順位は A=B(2点) > C=D(1点) になる
  submissions.forEach((s, i) => {
    for (const type of [1, 3]) {
      const qid = `q_${type}_${i}`;
      questions.push({
        question_id: qid,
        submission_id: s.submission_id,
        type,
        anchor: { sentence_index: 1, quoted_span: "x" },
        question_text: "q",
        model_answer: "a",
        acceptable_conditions: "",
        typical_wrong: "",
        scoring_steps: "s",
        difficulty_score: 3,
        gate1: null,
        gate2: null,
        gate3: null,
        status: "approved",
        prompt_version: "v1.0",
        model_id: "m",
      });
      results.push({
        question_id: qid,
        student_label: s.student_label,
        score:
          type === 1 ? 1 : type3Correct.has(s.student_label) ? 1 : 0,
        scored_at: "2026-07-07T00:00:00Z",
      });
    }
  });
  return { submissions, questions, results };
}

describe("アイテム分析", () => {
  const analysis = computeItemAnalysis(makeData());

  it("全体正答率を計算する", () => {
    // 8問中6問正解
    expect(analysis.overall.scored).toBe(8);
    expect(analysis.overall.correct_rate).toBeCloseTo(0.75);
  });

  it("型別の正答率を計算する", () => {
    const type1 = analysis.perType.find((t) => t.type === 1)!;
    const type3 = analysis.perType.find((t) => t.type === 3)!;
    expect(type1.correct_rate).toBe(1);
    expect(type3.correct_rate).toBeCloseTo(0.5);
  });

  it("弁別指数＝上位群と下位群の正答率差を計算する", () => {
    const type3 = analysis.perType.find((t) => t.type === 3)!;
    // 上位群(A,B)は100%、下位群(C,D)は0% → 弁別指数 1.0
    expect(type3.discrimination).toBeCloseTo(1.0);
    const type1 = analysis.perType.find((t) => t.type === 1)!;
    // 全員正解 → 弁別指数 0
    expect(type1.discrimination).toBeCloseTo(0);
  });

  it("弁別指数が低い型にフラグを立てる", () => {
    const type1 = analysis.perType.find((t) => t.type === 1)!;
    expect(type1.flags.some((f) => f.includes("弁別指数"))).toBe(true);
    const type3 = analysis.perType.find((t) => t.type === 3)!;
    expect(type3.flags).toHaveLength(0);
  });

  it("採点データのない型は null を返す", () => {
    const type2 = analysis.perType.find((t) => t.type === 2)!;
    expect(type2.correct_rate).toBeNull();
    expect(type2.discrimination).toBeNull();
  });

  it("生徒別の集計を返す", () => {
    const a = analysis.perStudent.find((s) => s.student_label === "A")!;
    const c = analysis.perStudent.find((s) => s.student_label === "C")!;
    expect(a.rate).toBe(1);
    expect(c.rate).toBeCloseTo(0.5);
  });
});
