/**
 * STEP5: 問い返し型フィードバック（P-05）。答えを直接与えない。
 * hint_level は誤答が続くたびに 1→2→3 と上げてクライアントから渡す。
 */
import { NextResponse } from "next/server";
import { render, PROMPT_CONFIG } from "@zdp/prompts";
import { getItemById } from "@/lib/master";
import { callGeminiJson } from "@/lib/gemini";

export const runtime = "nodejs";

interface P05Result {
  feedback: string;
}

export async function POST(req: Request) {
  const {
    question,
    correct_answer,
    student_answer,
    rationale,
    item_id,
    hint_level,
  } = await req.json();

  const item = item_id ? await getItemById(item_id) : null;

  const result = await callGeminiJson<P05Result>({
    promptId: "P-05",
    prompt: render("P-05", {
      question,
      correct_answer,
      student_answer,
      rationale: rationale || "",
      item: { common_misconceptions: item?.common_misconceptions ?? [] },
      hint_level: hint_level || 1,
    }),
    temperature: PROMPT_CONFIG["P-05"].temperature,
  });

  return NextResponse.json(result);
}
