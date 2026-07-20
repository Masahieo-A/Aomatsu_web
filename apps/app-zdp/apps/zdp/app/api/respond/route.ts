/**
 * プローブ回答の記録と4象限分類（STEP4の一部）。
 */
import { NextResponse } from "next/server";
import { classifyQuadrant } from "@/lib/diagnosis";
import { getRepository, safeWrite } from "@/lib/repository";
import type { ResponseRow } from "@/lib/repository";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    session_id,
    item_id,
    probe_type,
    question,
    answer,
    is_correct,
    confidence,
  } = body;

  const quadrant = classifyQuadrant(Boolean(is_correct), Number(confidence));

  const row: ResponseRow = {
    response_id: crypto.randomUUID(),
    session_id: session_id || "unknown",
    probe_type: probe_type || "structure",
    item_id: item_id || "",
    question: question || "",
    answer: String(answer ?? ""),
    is_correct: Boolean(is_correct),
    confidence: Number(confidence) || 0,
    quadrant,
    answered_at: new Date().toISOString(),
  };
  await safeWrite(() => getRepository().appendResponse(row));

  return NextResponse.json({ quadrant });
}
