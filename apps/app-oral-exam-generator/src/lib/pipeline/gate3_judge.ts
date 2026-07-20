import { z } from "zod";
import { Type } from "@google/genai";
import { generateJson, MODELS } from "@/lib/llm/gemini";
import { loadPrompt, renderPrompt } from "@/lib/llm/prompts";
import type { GateResult, Question } from "@/types";

/**
 * Gate 3：LLM審査（要件定義 §7.3）。
 * 生成とは独立したAPI呼び出し・「品質監査者」ロールで5項目を審査する。
 * 5項目中1つでも fail なら不合格。
 * レート制限対策として 1 submission 分をまとめて1回で審査する。
 */

const JUDGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    verdicts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question_id: { type: Type.STRING },
          checks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pass: { type: Type.BOOLEAN },
                reason: { type: Type.STRING },
              },
              required: ["pass", "reason"],
            },
          },
        },
        required: ["question_id", "checks"],
      },
    },
  },
  required: ["verdicts"],
};

const JudgeSchema = z.object({
  verdicts: z.array(
    z.object({
      question_id: z.string(),
      checks: z.array(z.object({ pass: z.boolean(), reason: z.string() })),
    })
  ),
});

export const JUDGE_CHECK_LABELS = [
  "根拠性",
  "解答可能性",
  "丸投げシミュレーション",
  "設問の平易さ",
  "採点一貫性",
] as const;

export async function runGate3(
  candidates: Question[],
  numberedText: string
): Promise<Map<string, GateResult>> {
  const results = new Map<string, GateResult>();
  if (candidates.length === 0) return results;

  const prompt = loadPrompt("judge");
  const rendered = renderPrompt(prompt.body, {
    TEXT_WITH_SENTENCE_NUMBERS: numberedText,
    QUESTIONS_JSON: JSON.stringify(
      candidates.map((q) => ({
        question_id: q.question_id,
        type: q.type,
        anchor: q.anchor,
        question_text: q.question_text,
        model_answer: q.model_answer,
        acceptable_conditions: q.acceptable_conditions,
        typical_wrong: q.typical_wrong,
        scoring_steps: q.scoring_steps,
      })),
      null,
      2
    ),
  });

  const raw = await generateJson({
    model: MODELS.flash,
    prompt: rendered,
    responseSchema: JUDGE_RESPONSE_SCHEMA,
    temperature: 0.2,
  });
  const judged = JudgeSchema.parse(raw);
  const verdictById = new Map(judged.verdicts.map((v) => [v.question_id, v]));

  for (const q of candidates) {
    const verdict = verdictById.get(q.question_id);
    if (!verdict || verdict.checks.length !== 5) {
      results.set(q.question_id, {
        pass: false,
        detail: { reason: "審査結果が不正な形式で返されました" },
      });
      continue;
    }
    const checks = verdict.checks.map((c, i) => ({
      item: JUDGE_CHECK_LABELS[i],
      pass: c.pass,
      reason: c.reason,
    }));
    results.set(q.question_id, {
      pass: checks.every((c) => c.pass),
      detail: { checks },
    });
  }

  return results;
}
