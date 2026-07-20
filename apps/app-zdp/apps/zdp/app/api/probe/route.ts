/**
 * STEP3: 構造・文法プローブ生成（P-02・雛形穴埋め）。
 * 語彙プローブはLLM不要のためクライアント側でCEFR照合結果から生成する。
 */
import { NextResponse } from "next/server";
import { render, PROMPT_CONFIG } from "@zdp/prompts";
import { getItemById } from "@/lib/master";
import { promptItem } from "@/lib/itemView";
import { callGeminiJson } from "@/lib/gemini";

export const runtime = "nodejs";

interface P02Result {
  question: string;
  choices: string[];
  correct_index: number;
  misconception_index: number;
  rationale: string;
}

export async function POST(req: Request) {
  const { sentence, item_id } = await req.json();
  const item = await getItemById(item_id);
  if (!item) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }
  const prompt = render("P-02", { sentence, item: promptItem(item) });
  const result = await callGeminiJson<P02Result>({
    promptId: "P-02",
    prompt,
    temperature: PROMPT_CONFIG["P-02"].temperature,
  });
  return NextResponse.json({ item_id, ...result });
}
