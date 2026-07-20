import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types";
import { generateGeminiAssistantJson } from "@/lib/gemini";

export const runtime = "nodejs";

type ChatRequestBody = {
  messages: ChatMessage[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = body?.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const last = messages[messages.length - 1];
    if (last?.role !== "user") {
      return NextResponse.json({ error: "last message must be user" }, { status: 400 });
    }

    const text = await generateGeminiAssistantJson(messages);

    return new Response(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    console.error("[/api/chat] error:", e);
    return NextResponse.json(
      { error: "エラーが発生しました。もう一度試してください。" },
      { status: 500 }
    );
  }
}

