import type { Question } from "@/types";

/**
 * 弁別メカニズムの分類（ver2.md §7.2）：
 * 時間圧系＝型1,5／産出知識系＝型2,4／著者性系＝型3
 */
export type Mechanism = "time" | "production" | "authorship";

export const MECHANISM_OF: Record<number, Mechanism> = {
  1: "time",
  5: "time",
  2: "production",
  4: "production",
  3: "authorship",
};

/** 解答形式の重み：客観（型1,4）=1／準客観（型2,5）=2／記述（型3）=3 */
const FORM_WEIGHT: Record<number, number> = { 1: 1, 4: 1, 2: 2, 5: 2, 3: 3 };

/**
 * 難易度スコア（Phase 3 精緻化版）。
 * ver2.md §4-Q5 に基づき「出題側の都合に由来する難しさ」のみを数値化して
 * 生徒間で均す（生徒本人の語彙選択に由来する難しさは対象外＝正当なペナルティ）。
 *
 * - 解答形式の負荷：客観1／準客観2／記述3 を2倍で主成分に
 * - 設問文の読み負荷：40字あたり1点（上限3点）
 * - 解答の産出量：模範解答40字あたり1点（上限2点）
 *
 * 目安レンジ：2.0（短い客観）〜 11.0（長い記述）
 */
export function computeDifficulty(question: {
  type: number;
  question_text: string;
  model_answer?: string;
}): number {
  const form = (FORM_WEIGHT[question.type] ?? 2) * 2;
  const questionLoad = Math.min(question.question_text.length / 40, 3);
  const answerLoad = Math.min((question.model_answer ?? "").length / 40, 2);
  return Math.round((form + questionLoad + answerLoad) * 10) / 10;
}

/** 同一アンカー（同じ文・同じ語）への重複出題の判定 */
function isDuplicateAnchor(a: Question, b: Question): boolean {
  return (
    a.anchor.quoted_span === b.anchor.quoted_span ||
    (a.anchor.sentence_index === b.anchor.sentence_index &&
      a.type === b.type)
  );
}

export interface SelectionResult {
  selected: Question[];
  warnings: string[];
}

/**
 * 選抜（要件定義 §7.4）：
 * 1. 弁別メカニズム2系統以上を含む
 * 2. 難易度スコアの合計が生徒間で近くなるよう選ぶ（Phase 1 は中庸選択で近似）
 * 3. 同一アンカーへの重複出題禁止
 *
 * 推奨デフォルト構成（ver2.md §7.2）に沿い、
 * 時間圧（型1優先）→産出（型2優先）→著者性（型3）の順で巡回して選ぶ。
 */
export function selectQuestions(
  passedCandidates: Question[],
  questionCount: number
): SelectionResult {
  const warnings: string[] = [];
  const selected: Question[] = [];

  // メカニズムごとに難易度中央値に近い順で並べる（生徒間の合計難易度を均すため
  // 極端に易しい/難しい候補より中庸を優先する）
  const byMechanism = new Map<Mechanism, Question[]>();
  for (const mech of ["time", "production", "authorship"] as Mechanism[]) {
    const group = passedCandidates.filter((q) => MECHANISM_OF[q.type] === mech);
    const scores = group.map((q) => q.difficulty_score).sort((a, b) => a - b);
    const median = scores[Math.floor(scores.length / 2)] ?? 0;
    group.sort(
      (a, b) =>
        Math.abs(a.difficulty_score - median) -
        Math.abs(b.difficulty_score - median)
    );
    byMechanism.set(mech, group);
  }

  const cycleOrder: Mechanism[] = ["time", "production", "authorship"];
  const canTake = (q: Question) =>
    !selected.some((s) => isDuplicateAnchor(s, q));

  // 巡回選択：各メカニズムから1問ずつ
  let guard = 0;
  while (selected.length < questionCount && guard < questionCount * 3) {
    let picked = false;
    for (const mech of cycleOrder) {
      if (selected.length >= questionCount) break;
      const pool = byMechanism.get(mech) ?? [];
      const idx = pool.findIndex(canTake);
      if (idx !== -1) {
        selected.push(pool.splice(idx, 1)[0]);
        picked = true;
      }
    }
    if (!picked) break;
    guard++;
  }

  // 制約チェック
  const mechanisms = new Set(selected.map((q) => MECHANISM_OF[q.type]));
  if (selected.length > 1 && mechanisms.size < 2) {
    warnings.push(
      "弁別メカニズムが1系統しか確保できませんでした（推奨：2系統以上）"
    );
  }
  if (selected.length < questionCount) {
    warnings.push(
      `合格候補が不足しています（${selected.length}/${questionCount}問）。` +
        "レビュー画面で候補一覧から手動昇格するか、再生成してください。"
    );
  }

  return { selected, warnings };
}
