/**
 * Gemini API（@google/genai）を1回だけ呼び出し、構造化 JSON 応答を Zod で検証して返す。
 * HTTP リトライは SDK 側で attempts:1 に抑え、意図しない再課金ループを避ける。
 */
import { ApiError, FinishReason, GoogleGenAI, Type } from "@google/genai";

import { SYSTEM_PROMPT } from "./prompt";
import { OutputSchema, type OutputType, ERROR_TYPE_VALUES } from "./schema";

export const GEMINI_MODEL = "gemini-2.5-flash";

/** generateContent に渡す responseSchema（ErrorType の列挙を含む） */
function buildResponseSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      wordCount: {
        type: Type.OBJECT,
        properties: {
          count: { type: Type.INTEGER },
          satisfied: { type: Type.BOOLEAN },
        },
        required: ["count", "satisfied"],
      },
      positiveComment: { type: Type.STRING },
      errors: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sentence: { type: Type.STRING },
            errorType: {
              type: Type.STRING,
              format: "enum",
              enum: [...ERROR_TYPE_VALUES],
            },
            specificTerm: {
              type: Type.STRING,
              nullable: true,
            },
            hints: {
              type: Type.OBJECT,
              properties: {
                level1: { type: Type.STRING },
                level2: { type: Type.STRING },
                level3: { type: Type.STRING },
              },
              required: ["level1", "level2", "level3"],
            },
            correction: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  format: "enum",
                  enum: ["blank", "rewrite"],
                },
                maskedSentence: { type: Type.STRING },
                acceptableAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctedSentence: { type: Type.STRING },
              },
              required: [
                "type",
                "maskedSentence",
                "acceptableAnswers",
                "correctedSentence",
              ],
            },
          },
          required: [
            "sentence",
            "errorType",
            "specificTerm",
            "hints",
            "correction",
          ],
        },
      },
    },
    required: ["wordCount", "positiveComment", "errors"],
  };
}

function buildUserContent(
  topic: string,
  wordCountReq: string,
  essay: string
): string {
  return `以下の依頼に従い、英作文の文法評価の結果のみをJSONで出力してください。

# 出題テーマ
${topic}

# 語数の条件
${wordCountReq}

# 生徒の英作文
${essay}`;
}

/**
 * 添削用に Gemini を1回だけ呼び出す。失敗時は例外を投げる（再試行しない）。
 */
export async function evaluateEssayWithGemini(
  topic: string,
  wordCountReq: string,
  essay: string
): Promise<OutputType> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      retryOptions: {
        attempts: 1,
      },
    },
  });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildUserContent(topic, wordCountReq, essay),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: buildResponseSchema(),
        temperature: 0.3,
      },
    });

    const reason = response.candidates?.[0]?.finishReason;
    if (reason && reason !== FinishReason.STOP) {
      const needsUserAttention =
        reason === FinishReason.SAFETY || reason === FinishReason.RECITATION;
      if (needsUserAttention) {
        throw new Error("GEMINI_RESPONSE_BLOCKED");
      }
    }

    text = response.text;
  } catch (e) {
    if (e instanceof ApiError) {
      throw e;
    }
    throw e;
  }

  if (!text || text.trim().length === 0) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("GEMINI_JSON_PARSE");
  }

  const validated = OutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("GEMINI_OUTPUT_VALIDATION");
  }

  return validated.data;
}

export function isGeminiApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
