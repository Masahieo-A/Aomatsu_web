import type { ChatMessage } from "@/types";
import { INTERSECTION_SUMMARY_SCHEMA } from "@/lib/intersectionSummarySchema";
import { INTERSECTION_SUMMARY_SYSTEM } from "@/lib/intersectionSummaryPrompt";
import { getClient } from "@/lib/gemini";

const MODEL_ID = "gemini-2.5-flash";

export async function generateIntersectionSummaryJson(messages: ChatMessage[]) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: INTERSECTION_SUMMARY_SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: INTERSECTION_SUMMARY_SCHEMA,
      maxOutputTokens: 4096
    }
  });

  const userPayload = JSON.stringify(
    { messages },
    null,
    0
  );

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPayload }] }]
  });

  return result.response.text();
}
