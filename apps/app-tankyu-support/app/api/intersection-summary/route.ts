import { NextResponse } from "next/server";
import type { ChatMessage } from "@/types";
import { generateIntersectionSummaryJson } from "@/lib/generateIntersectionSummary";
import { isLensLabel } from "@/lib/inquiryConstants";
import type { IntersectionSummaryPayload } from "@/lib/intersectionSummarySchema";

export const runtime = "nodejs";

type Body = {
  messages: ChatMessage[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const messages = body?.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const last = messages[messages.length - 1];
    if (last?.role !== "user" || !isLensLabel(last.content)) {
      return NextResponse.json(
        { error: "last message must be user lens selection" },
        { status: 400 }
      );
    }

    const raw = await generateIntersectionSummaryJson(messages);
    let data: IntersectionSummaryPayload;
    try {
      data = JSON.parse(raw) as IntersectionSummaryPayload;
    } catch {
      return NextResponse.json({ error: "invalid model response" }, { status: 502 });
    }

    if (!Array.isArray(data.exampleQuestions) || data.exampleQuestions.length !== 3) {
      return NextResponse.json({ error: "invalid summary shape" }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("[/api/intersection-summary] error:", e);
    return NextResponse.json(
      { error: "エラーが発生しました。もう一度試してください。" },
      { status: 500 }
    );
  }
}
