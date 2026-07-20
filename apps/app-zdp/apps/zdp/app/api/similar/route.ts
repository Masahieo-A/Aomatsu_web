/**
 * STEP5: 類似例文生成（P-03・i+1）→ 検証（P-04）。
 * 検証failは最大2回まで再生成、それでもfailならマスタの陽性例にフォールバック。
 * 検証済み例文はキャッシュに保存（資産化 / S-04）。
 */
import { NextResponse } from "next/server";
import { render, PROMPT_CONFIG } from "@zdp/prompts";
import { getItemById } from "@/lib/master";
import { promptItem } from "@/lib/itemView";
import { callGeminiJson } from "@/lib/gemini";
import { sentenceHash } from "@/lib/hash";
import { getRepository, safeWrite } from "@/lib/repository";

export const runtime = "nodejs";

interface P03Result {
  sentence: string;
  target_structure_span: string;
  japanese: string;
}
interface P04Result {
  grammatical: boolean;
  contains_target: boolean;
  level_ok: boolean;
  pass: boolean;
  issue: string;
}

const MAX_RETRY = 2;

export async function POST(req: Request) {
  const { item_id, target_level, max_words } = await req.json();
  const item = await getItemById(item_id);
  if (!item) {
    return NextResponse.json({ error: "item not found" }, { status: 404 });
  }
  const targetLevel = target_level || item.level;
  const maxWords = max_words || 14;
  const reference = item.positive_examples[0]?.sentence ?? "";

  let generated: P03Result | null = null;
  let verified = false;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    const gen = await callGeminiJson<P03Result>({
      promptId: "P-03",
      prompt: render("P-03", {
        item: promptItem(item),
        reference_sentence: reference,
        target_level: targetLevel,
        max_words: maxWords,
      }),
      temperature: PROMPT_CONFIG["P-03"].temperature,
    });
    const check = await callGeminiJson<P04Result>({
      promptId: "P-04",
      prompt: render("P-04", {
        generated_sentence: gen.sentence,
        item: promptItem(item),
        target_level: targetLevel,
      }),
      temperature: PROMPT_CONFIG["P-04"].temperature,
    });
    if (check.pass) {
      generated = gen;
      verified = true;
      break;
    }
    generated = gen; // 最後の生成を保持（フォールバック比較用）
  }

  // フォールバック: 検証を通らなければマスタの陽性例を使う
  if (!verified) {
    const pos = item.positive_examples[0];
    generated = {
      sentence: pos?.sentence ?? reference,
      target_structure_span: pos?.span ?? "",
      japanese: "",
    };
  }

  // 検証済み例文をキャッシュに資産として保存
  if (verified && generated) {
    const h = sentenceHash(generated.sentence);
    await safeWrite(() =>
      getRepository().putCache({
        sentence_hash: h,
        sentence: generated!.sentence,
        analysis_json: JSON.stringify({
          generated_for: item.id,
          span: generated!.target_structure_span,
          japanese: generated!.japanese,
        }),
        verified: true,
        hit_count: 0,
      })
    );
  }

  return NextResponse.json({
    item_id,
    sentence: generated!.sentence,
    span: generated!.target_structure_span,
    japanese: generated!.japanese,
    verified,
  });
}
