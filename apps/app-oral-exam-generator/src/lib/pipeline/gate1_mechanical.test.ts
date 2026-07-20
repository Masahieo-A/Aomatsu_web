import { describe, it, expect } from "vitest";
import { runGate1 } from "./gate1_mechanical";

// テスト用の本文（3文）
const fullText =
  "I want to be a doctor. My grandmother was sick last year. They helped her at the hospital.";
const sentences = [
  { index: 1, text: "I want to be a doctor." },
  { index: 2, text: "My grandmother was sick last year." },
  { index: 3, text: "They helped her at the hospital." },
];

const validCandidate = {
  anchor: { sentence_index: 3, quoted_span: "They" },
  question_text: "第3文の **They** は、具体的に誰を指していますか。",
  model_answer: "医師や看護師など病院の人々",
  scoring_steps: "①指示対象の特定 ②文脈との整合を確認",
};

describe("Gate1 機械検証", () => {
  it("正しい候補を通過させる", () => {
    const result = runGate1(validCandidate, [], sentences, fullText);
    expect(result.pass).toBe(true);
  });

  it("本文に存在しない引用スパン（捏造）を弾く", () => {
    const fabricated = {
      ...validCandidate,
      anchor: { sentence_index: 2, quoted_span: "environmental problems" },
    };
    const result = runGate1(fabricated, [], sentences, fullText);
    expect(result.pass).toBe(false);
    expect(
      (result.detail as { failures: string[] }).failures.join()
    ).toContain("完全一致で存在しません");
  });

  it("大文字小文字が本文と異なる引用を弾く（完全一致・大文字小文字を区別）", () => {
    const wrongCase = {
      ...validCandidate,
      anchor: { sentence_index: 3, quoted_span: "they" },
    };
    const result = runGate1(wrongCase, [], sentences, fullText);
    expect(result.pass).toBe(false);
  });

  it("実在しない文番号を弾く", () => {
    const badIndex = {
      ...validCandidate,
      anchor: { sentence_index: 9, quoted_span: "They" },
    };
    const result = runGate1(badIndex, [], sentences, fullText);
    expect(result.pass).toBe(false);
    expect(
      (result.detail as { failures: string[] }).failures.join()
    ).toContain("文番号 9 が実在しません");
  });

  it("引用スパンが指定の文に含まれない場合を弾く", () => {
    const wrongSentence = {
      ...validCandidate,
      anchor: { sentence_index: 1, quoted_span: "grandmother" },
    };
    const result = runGate1(wrongSentence, [], sentences, fullText);
    expect(result.pass).toBe(false);
  });

  it("模範解答・判定手順が空の候補を弾く", () => {
    const empty = { ...validCandidate, model_answer: "  ", scoring_steps: "" };
    const result = runGate1(empty, [], sentences, fullText);
    expect(result.pass).toBe(false);
    const failures = (result.detail as { failures: string[] }).failures;
    expect(failures.some((f) => f.includes("模範解答"))).toBe(true);
    expect(failures.some((f) => f.includes("判定手順"))).toBe(true);
  });

  it("設問間リーク（他候補の模範解答の内容語が設問文に出現）を弾く", () => {
    const leaky = {
      anchor: { sentence_index: 2, quoted_span: "sick" },
      question_text:
        "あなたの grandmother が sick だったとき hospital で何がありましたか。",
      model_answer: "祖母の看病の経験",
      scoring_steps: "①経験の具体性を確認",
    };
    const other = { model_answer: "the hospital" }; // hospital（4文字以上）がリーク
    const result = runGate1(leaky, [other], sentences, fullText);
    expect(result.pass).toBe(false);
    expect(
      (result.detail as { failures: string[] }).failures.join()
    ).toContain("hospital");
  });

  it("自分自身のアンカー引用語はリークとみなさない", () => {
    const candidate = {
      anchor: { sentence_index: 3, quoted_span: "hospital" },
      question_text: "本文中の **hospital** を別の簡単な英語で言い換えなさい。",
      model_answer: "clinic",
      scoring_steps: "①意味の一致を確認",
    };
    const other = { model_answer: "at the hospital" };
    const result = runGate1(candidate, [other], sentences, fullText);
    expect(result.pass).toBe(true);
  });
});
