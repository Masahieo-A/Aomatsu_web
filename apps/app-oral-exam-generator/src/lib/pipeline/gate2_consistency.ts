import { z } from "zod";
import { Type } from "@google/genai";
import { generateJson, MODELS } from "@/lib/llm/gemini";
import { loadPrompt, renderPrompt } from "@/lib/llm/prompts";
import type { GateResult, Question } from "@/types";

/**
 * Gate 2：自己整合性検証（要件定義 §7.3）。
 * 生成時のコンテキストを渡さず「本文＋設問」のみで独立に解答させ、
 * 模範解答と照合する。
 * - 型1・4（抜き出し系）：正規化後の文字列比較
 * - 型2・3・5（記述系）：意味的一致をLLM判定
 * レート制限対策として、1 submission 分の設問をまとめて判定する
 * （solve 1回＋semantic_match 最大1回）。
 */

/**
 * 抜き出し解答の照合時に無視する先頭の限定詞・所有格。
 * 「These small actions」と「small actions」は同一の指示対象であり、
 * この差で不一致にすると正しい問いを誤棄却する（ゴールデンラン
 * report-2026-07-07-1351 で実測された誤棄却パターン）。
 */
const LEADING_DETERMINERS =
  /^(the|a|an|this|that|these|those|my|our|your|his|her|its|their|some|any)\s+/;

/** 抜き出し解答の正規化：小文字化・前後空白と引用符・末尾句読点の除去・空白圧縮・先頭限定詞の除去 */
export function normalizeExtraction(s: string): string {
  const base = s
    .toLowerCase()
    .trim()
    .replace(/^["'“”‘’`「」]+|["'“”‘’`「」]+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return base.replace(LEADING_DETERMINERS, "");
}

/** 型1・4の文字列比較（正規化後の完全一致） */
export function extractionMatches(
  modelAnswer: string,
  independentAnswer: string
): boolean {
  return normalizeExtraction(modelAnswer) === normalizeExtraction(independentAnswer);
}

const SOLVE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question_id: { type: Type.STRING },
          answerable: { type: Type.BOOLEAN },
          answer: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ["question_id", "answerable", "answer", "note"],
      },
    },
  },
  required: ["answers"],
};

const SolveSchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string(),
      answerable: z.boolean(),
      answer: z.string(),
      note: z.string(),
    })
  ),
});

const MATCH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question_id: { type: Type.STRING },
          match: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
        },
        required: ["question_id", "match", "reason"],
      },
    },
  },
  required: ["results"],
};

const MatchSchema = z.object({
  results: z.array(
    z.object({
      question_id: z.string(),
      match: z.boolean(),
      reason: z.string(),
    })
  ),
});

const EXTRACTION_TYPES = new Set([1, 4]);

/**
 * 型3（著者性設問）は「本文に答えが書かれていない」ことが弁別メカニズムそのもの
 * （ver2.md §4-Q3）のため、独立解答との照合になじまない。Gate2 は対象外とし、
 * 品質は Gate3（審査）と教員レビューで担保する。
 */
const AUTHORSHIP_TYPES = new Set([3]);

/**
 * 1 submission 分の候補（Gate1通過済み）に Gate2 を一括適用する。
 * 戻り値は question_id → GateResult。
 */
export async function runGate2(
  candidates: Question[],
  numberedText: string
): Promise<Map<string, GateResult>> {
  const results = new Map<string, GateResult>();
  if (candidates.length === 0) return results;

  const targets: Question[] = [];
  for (const q of candidates) {
    if (AUTHORSHIP_TYPES.has(q.type)) {
      results.set(q.question_id, {
        pass: true,
        detail: {
          method: "exempt",
          reason:
            "型3（著者性設問）は第三者が本文だけでは解答できないことが仕様のため、独立解答検証の対象外",
        },
      });
    } else {
      targets.push(q);
    }
  }
  if (targets.length === 0) return results;

  // --- 独立解答（gemini-2.5-flash-lite・生成コンテキストは渡さない） ---
  const solvePrompt = loadPrompt("solve");
  const solveRendered = renderPrompt(solvePrompt.body, {
    TEXT_WITH_SENTENCE_NUMBERS: numberedText,
    QUESTIONS_JSON: JSON.stringify(
      targets.map((q) => ({
        question_id: q.question_id,
        question_text: q.question_text,
      })),
      null,
      2
    ),
  });
  const solveRaw = await generateJson({
    model: MODELS.flashLite,
    prompt: solveRendered,
    responseSchema: SOLVE_RESPONSE_SCHEMA,
    temperature: 0.2,
  });
  const solved = SolveSchema.parse(solveRaw);
  const answerById = new Map(solved.answers.map((a) => [a.question_id, a]));

  // --- 型別の照合 ---
  const semanticPairs: {
    question_id: string;
    question_text: string;
    model_answer: string;
    independent_answer: string;
    method: "semantic" | "string_fallback";
  }[] = [];

  for (const q of targets) {
    const independent = answerById.get(q.question_id);
    if (!independent) {
      results.set(q.question_id, {
        pass: false,
        detail: { reason: "独立解答が返されませんでした" },
      });
      continue;
    }
    if (!independent.answerable) {
      results.set(q.question_id, {
        pass: false,
        detail: {
          reason: `独立解答者が解答不能と判定: ${independent.note}`,
          independent_answer: independent.answer,
        },
      });
      continue;
    }
    if (EXTRACTION_TYPES.has(q.type)) {
      if (extractionMatches(q.model_answer, independent.answer)) {
        results.set(q.question_id, {
          pass: true,
          detail: { method: "string", independent_answer: independent.answer },
        });
      } else {
        // 表記ゆれ（区切り記号・列挙順など）の可能性があるため、
        // 即不合格にせず意味一致判定にフォールバックする
        semanticPairs.push({
          question_id: q.question_id,
          question_text: q.question_text,
          model_answer: q.model_answer,
          independent_answer: independent.answer,
          method: "string_fallback",
        });
      }
    } else {
      semanticPairs.push({
        question_id: q.question_id,
        question_text: q.question_text,
        model_answer: q.model_answer,
        independent_answer: independent.answer,
        method: "semantic",
      });
    }
  }

  // --- 記述系の意味一致判定（対象がある場合のみ1回呼ぶ） ---
  if (semanticPairs.length > 0) {
    const matchPrompt = loadPrompt("semantic_match");
    const matchRendered = renderPrompt(matchPrompt.body, {
      PAIRS_JSON: JSON.stringify(
        semanticPairs.map((pair) => ({
          question_id: pair.question_id,
          question_text: pair.question_text,
          model_answer: pair.model_answer,
          independent_answer: pair.independent_answer,
        })),
        null,
        2
      ),
    });
    const matchRaw = await generateJson({
      model: MODELS.flashLite,
      prompt: matchRendered,
      responseSchema: MATCH_RESPONSE_SCHEMA,
      temperature: 0.1,
    });
    const matched = MatchSchema.parse(matchRaw);
    const matchById = new Map(matched.results.map((r) => [r.question_id, r]));
    for (const pair of semanticPairs) {
      const result = matchById.get(pair.question_id);
      results.set(pair.question_id, {
        pass: result?.match ?? false,
        detail: {
          method: pair.method,
          independent_answer: pair.independent_answer,
          reason: result?.reason ?? "意味一致判定が返されませんでした",
        },
      });
    }
  }

  return results;
}
