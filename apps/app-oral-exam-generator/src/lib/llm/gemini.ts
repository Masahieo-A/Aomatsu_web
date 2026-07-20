import { GoogleGenAI } from "@google/genai";
import PQueue from "p-queue";

export const MODELS = {
  /** 候補生成・LLM審査 */
  flash: "gemini-2.5-flash",
  /** 自己整合性検証・意味一致判定 */
  flashLite: "gemini-2.5-flash-lite",
} as const;

// 無料枠 約10RPM 対応：直列＋呼び出し間隔6秒以上（要件定義 §7）
const queue = new PQueue({ concurrency: 1, interval: 6500, intervalCap: 1 });

const MAX_RETRIES = 3;

// コスト防御（§12）：1回の一括実行あたりの総呼び出し上限は Phase 2 で使用
export const CALL_LIMIT_PER_RUN = 500;
let callCount = 0;
export function resetCallCount(): void {
  callCount = 0;
}
export function getCallCount(): number {
  return callCount;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY が設定されていません。.env.local を確認してください。"
    );
  }
  return new GoogleGenAI({ apiKey });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

export interface GenerateJsonOptions {
  model: string;
  prompt: string;
  /** Gemini の responseSchema（構造化出力を強制する。必須） */
  responseSchema: object;
  temperature?: number;
}

/**
 * 構造化出力つき生成呼び出し。
 * 全呼び出しをキューで直列化し、指数バックオフで最大3回リトライ。
 * 429（レート制限）時は60秒待機してから再試行する。
 */
export async function generateJson<T = unknown>(
  options: GenerateJsonOptions
): Promise<T> {
  const result = await queue.add(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        callCount++;
        const response = await getClient().models.generateContent({
          model: options.model,
          contents: options.prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: options.responseSchema,
            temperature: options.temperature ?? 0.7,
          },
        });
        const text = response.text;
        if (!text) throw new Error("Gemini から空の応答が返されました");
        return JSON.parse(text) as T;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          await sleep(isRateLimit(err) ? 60_000 : 2_000 * 2 ** attempt);
        }
      }
    }
    throw lastError;
  });
  return result as T;
}
