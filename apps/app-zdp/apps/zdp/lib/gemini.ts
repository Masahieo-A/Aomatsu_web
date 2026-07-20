/**
 * Gemini Flash クライアント（要件: Flash系統のみ / 上位モデル禁止）。
 * - REST の generateContent を直接叩く（SDKバージョン依存を避ける）
 * - responseMimeType: application/json で構造化出力を強制
 * - JSONパース失敗時は1回だけリトライ（共通実装規約1）
 * - GEMINI_API_KEY 未設定時はモックで応答（UI/フロー確認用）
 */
import type { PromptId } from "@zdp/prompts";
import { PROMPT_VERSION } from "@zdp/prompts";
import { logApiCall } from "./repository";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const API_KEY = process.env.GEMINI_API_KEY;
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface CallOptions {
  promptId: PromptId;
  prompt: string;
  temperature: number;
  /** モック応答生成のためのヒント（実データには影響しない） */
  mockContext?: Record<string, unknown>;
}

export const isMockMode = () => !API_KEY;

/** 単発呼び出し。JSONを返す。 */
export async function callGeminiJson<T = unknown>(
  opts: CallOptions
): Promise<T> {
  if (isMockMode()) {
    return mockResponse<T>(opts);
  }
  const body = {
    contents: [{ parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature,
      responseMimeType: "application/json",
    },
  };

  const doFetch = async (): Promise<string> => {
    const res = await fetch(`${ENDPOINT(MODEL)}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    // usage記録（コスト監視 / S-06）
    const usage = data?.usageMetadata ?? {};
    void logApiCall({
      date: new Date().toISOString(),
      call_type: opts.promptId,
      prompt_version: PROMPT_VERSION,
      token_in: usage.promptTokenCount ?? 0,
      token_out: usage.candidatesTokenCount ?? 0,
      cached: false,
    });
    return text;
  };

  let raw = await doFetch();
  try {
    return parseJson<T>(raw);
  } catch {
    // 「JSONのみを出力してください」を付加せず、responseMimeが効くので同条件で1回だけ再試行
    raw = await doFetch();
    return parseJson<T>(raw);
  }
}

/**
 * self-consistency: 同一プロンプトを runs 回実行し、
 * pick で抽出したキーの多数決を取る。代表応答（多数派の最初）も返す。
 */
export async function selfConsistency<T>(
  opts: CallOptions,
  runs: number,
  keyOf: (r: T) => string
): Promise<{ majority: T; votes: Record<string, number>; all: T[] }> {
  const all: T[] = [];
  for (let i = 0; i < runs; i++) {
    all.push(await callGeminiJson<T>(opts));
  }
  const votes: Record<string, number> = {};
  for (const r of all) {
    const k = keyOf(r);
    votes[k] = (votes[k] ?? 0) + 1;
  }
  const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  const majority = all.find((r) => keyOf(r) === winner)!;
  return { majority, votes, all };
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ----------------------------------------------------------------
//  モック（API_KEY未設定時）。要件のJSONスキーマに沿った擬似応答。
// ----------------------------------------------------------------
function mockResponse<T>(opts: CallOptions): T {
  const ctx = opts.mockContext ?? {};
  switch (opts.promptId) {
    case "P-01": {
      // 表層パターンにマッチした候補ほど contains=true になりやすい擬似ロジック
      const hinted = Boolean(ctx.surfaceHit);
      return {
        item_id: ctx.itemId ?? "G000",
        contains: hinted,
        evidence: hinted ? String(ctx.evidence ?? "") : "",
      } as T;
    }
    case "P-02":
      return {
        question:
          "【モック】次の文の主節の動詞はどれ？ The theory, first proposed in 1984, has been challenged.",
        choices: ["proposed", "has been challenged", "theory", "challenged"],
        correct_index: 1,
        misconception_index: 0,
        rationale:
          "挿入句 first proposed in 1984 は修飾。主節の動詞は has been challenged。",
      } as T;
    case "P-03":
      return {
        sentence: "The song, written by my friend, became popular at school.",
        target_structure_span: "written by my friend",
        japanese: "友達によって書かれたその歌は、学校で人気になった。",
      } as T;
    case "P-04":
      return {
        grammatical: true,
        contains_target: true,
        level_ok: true,
        pass: true,
        issue: "",
      } as T;
    case "P-05":
      return {
        feedback:
          "惜しい！コンマで囲まれた部分をいったん外して読むと、主語のすぐ後ろにくる動詞はどれかな？",
      } as T;
    case "P-06":
      return {
        uses_target_item: true,
        target_item_correct: true,
        error_span: "",
        error_type: "",
      } as T;
    default:
      return {} as T;
  }
}
