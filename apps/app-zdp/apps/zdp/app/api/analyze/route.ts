/**
 * STEP1-2: 前処理（語彙・表層パターン）→ 文法項目タグ付け（P-01・self-consistency 3回）。
 * キャッシュヒット時は STEP1-2 の API 呼び出しを行わない（S-04 / 受け入れ基準5）。
 */
import { NextResponse } from "next/server";
import { render, PROMPT_CONFIG } from "@zdp/prompts";
import { analyzeVocab, type Level } from "@/lib/cefr";
import { detectCandidates } from "@/lib/surface";
import { getItems } from "@/lib/master";
import { promptItem } from "@/lib/itemView";
import { sentenceHash } from "@/lib/hash";
import { selfConsistency, isMockMode } from "@/lib/gemini";
import {
  getRepository,
  safeWrite,
  storageMode,
} from "@/lib/repository";

export const runtime = "nodejs";

interface P01Result {
  item_id: string;
  contains: boolean;
  evidence: string;
}

interface IdentifiedItem {
  id: string;
  name: string;
  level: string;
  evidence: string;
  prerequisites: string[];
}

export async function POST(req: Request) {
  const { sentence, learnerId, level } = await req.json();
  if (!sentence || typeof sentence !== "string") {
    return NextResponse.json({ error: "sentence is required" }, { status: 400 });
  }
  const targetLevel: Level = (level as Level) || "B1";
  const hash = sentenceHash(sentence);
  const repo = getRepository();
  const sessionId = crypto.randomUUID();

  // --- キャッシュ照合 ---
  const cached = await repo.getCache(hash).catch(() => null);
  if (cached) {
    await safeWrite(() =>
      repo.putCache({ ...cached, hit_count: cached.hit_count + 1 })
    );
    const analysis = JSON.parse(cached.analysis_json);
    await recordSession(sessionId, learnerId, sentence, hash, analysis.identified);
    return NextResponse.json({
      session_id: sessionId,
      sentence_hash: hash,
      cached: true,
      mock: isMockMode(),
      storage: storageMode(),
      ...analysis,
    });
  }

  // --- STEP1: 前処理 ---
  const items = await getItems();
  const { difficult } = await analyzeVocab(sentence, targetLevel);
  const candidates = detectCandidates(sentence, items);

  // --- STEP2: P-01 タグ付け（候補ごとに self-consistency 3回多数決） ---
  const identified: IdentifiedItem[] = [];
  for (const c of candidates) {
    const item = c.item;
    const prompt = render("P-01", {
      sentence,
      item: promptItem(item),
    });
    const { majority } = await selfConsistency<P01Result>(
      {
        promptId: "P-01",
        prompt,
        temperature: PROMPT_CONFIG["P-01"].temperature,
        mockContext: {
          itemId: item.id,
          surfaceHit: c.score >= 3,
          evidence: item.positive_examples[0]?.span ?? "",
        },
      },
      PROMPT_CONFIG["P-01"].selfConsistency,
      (r) => String(r.contains)
    );
    if (majority.contains) {
      identified.push({
        id: item.id,
        name: item.name,
        level: item.level,
        evidence: majority.evidence,
        prerequisites: item.prerequisites,
      });
    }
  }

  const analysis = {
    difficult_words: difficult,
    identified,
    // unclassified: 候補はあったが全てNO → マスタ拡充のフィードバック（§6）
    unclassified: identified.length === 0 && candidates.length > 0,
  };

  // --- キャッシュ保存 ---
  await safeWrite(() =>
    repo.putCache({
      sentence_hash: hash,
      sentence,
      analysis_json: JSON.stringify(analysis),
      verified: false,
      hit_count: 0,
    })
  );
  await recordSession(sessionId, learnerId, sentence, hash, identified);

  return NextResponse.json({
    session_id: sessionId,
    sentence_hash: hash,
    cached: false,
    mock: isMockMode(),
    storage: storageMode(),
    ...analysis,
  });
}

async function recordSession(
  sessionId: string,
  learnerId: string | undefined,
  sentence: string,
  hash: string,
  identified: { id: string }[]
) {
  const repo = getRepository();
  const lid = learnerId || "anonymous";
  await safeWrite(() =>
    repo.ensureLearner({
      learner_id: lid,
      display_name: lid,
      current_level: "B1",
      created_at: new Date().toISOString(),
    })
  );
  await safeWrite(() =>
    repo.appendSession({
      session_id: sessionId,
      learner_id: lid,
      input_sentence: sentence,
      sentence_hash: hash,
      identified_items: identified.map((i) => i.id).join(","),
      root_cause: "",
      started_at: new Date().toISOString(),
      ended_at: "",
    })
  );
}
