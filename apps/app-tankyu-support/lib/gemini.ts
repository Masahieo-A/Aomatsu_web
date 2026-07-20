import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "@/types";
import { GEMINI_ASSISTANT_RESPONSE_SCHEMA } from "@/lib/assistantResponseSchema";
import { SYSTEM_INSTRUCTION_FOR_API } from "@/lib/systemInstruction";

const MODEL_ID = "gemini-2.5-flash";

function normalizeMessagesForChat(messages: ChatMessage[]): ChatMessage[] {
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  if (firstUserIdx <= 0) return messages.slice(Math.max(firstUserIdx, 0));
  return messages.slice(firstUserIdx);
}

export function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * 1ターン分の応答を **JSON（responseSchema 準拠）** で取得する。
 * ストリーミングは使わず、完成した JSON 文字列を返す（クライアントは従来どおり一括受信）。
 */
export async function generateGeminiAssistantJson(messages: ChatMessage[]) {
  const normalized = normalizeMessagesForChat(messages);
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: SYSTEM_INSTRUCTION_FOR_API,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GEMINI_ASSISTANT_RESPONSE_SCHEMA,
      maxOutputTokens: 8192
    }
  });

  const history = normalized.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));
  const latest = normalized[normalized.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(latest?.content ?? "");
  return result.response.text();
}
