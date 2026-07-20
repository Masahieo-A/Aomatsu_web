import type { GateResult, QuestionAnchor } from "@/types";

export interface Gate1Candidate {
  anchor: QuestionAnchor;
  question_text: string;
  model_answer: string;
  scoring_steps: string;
}

/**
 * Gate 1：機械検証（LLM不使用・決定的）。要件定義 §7.3
 *
 * 1. anchor.quoted_span が本文中に完全一致で存在するか（大文字小文字を区別）
 * 2. anchor.sentence_index が実在し、quoted_span がその文に含まれるか
 * 3. model_answer / scoring_steps が空でないか
 * 4. 設問間リーク：他候補の model_answer の内容語（4文字以上の英単語）が
 *    この候補の question_text に含まれないか
 */
export function runGate1(
  candidate: Gate1Candidate,
  otherCandidates: { model_answer: string }[],
  sentences: { index: number; text: string }[],
  fullText: string
): GateResult {
  const failures: string[] = [];

  // 1. 引用スパンの本文内完全一致
  const span = candidate.anchor.quoted_span;
  if (!span || span.trim() === "") {
    failures.push("引用スパン（quoted_span）が空です");
  } else if (!fullText.includes(span)) {
    failures.push(`引用スパン「${span}」が本文中に完全一致で存在しません`);
  }

  // 2. 文番号の実在と引用の文内一致
  const sentence = sentences.find(
    (s) => s.index === candidate.anchor.sentence_index
  );
  if (!sentence) {
    failures.push(
      `文番号 ${candidate.anchor.sentence_index} が実在しません（全${sentences.length}文）`
    );
  } else if (span && fullText.includes(span) && !sentence.text.includes(span)) {
    failures.push(
      `引用スパン「${span}」が第${candidate.anchor.sentence_index}文に含まれていません`
    );
  }

  // 3. 模範解答・判定手順の欠落
  if (!candidate.model_answer || candidate.model_answer.trim() === "") {
    failures.push("模範解答（model_answer）が空です");
  }
  if (!candidate.scoring_steps || candidate.scoring_steps.trim() === "") {
    failures.push("判定手順（scoring_steps）が空です");
  }

  // 4. 設問間リーク（他候補の模範解答の内容語が設問文に出現しないか）
  const questionLower = candidate.question_text.toLowerCase();
  const leakedWords = new Set<string>();
  for (const other of otherCandidates) {
    const contentWords = other.model_answer.match(/[A-Za-z]{4,}/g) ?? [];
    for (const word of contentWords) {
      const lower = word.toLowerCase();
      const re = new RegExp(`\\b${lower}\\b`, "i");
      if (re.test(questionLower)) leakedWords.add(lower);
    }
  }
  // 自分自身のアンカー引用語は「本文を指し示すための引用」なのでリークとみなさない
  const ownSpanWords = new Set(
    (span?.match(/[A-Za-z]{4,}/g) ?? []).map((w) => w.toLowerCase())
  );
  const trueLeaks = [...leakedWords].filter((w) => !ownSpanWords.has(w));
  if (trueLeaks.length > 0) {
    failures.push(
      `他候補の模範解答の内容語が設問文に含まれています: ${trueLeaks.join(", ")}`
    );
  }

  return {
    pass: failures.length === 0,
    detail: { failures },
  };
}
