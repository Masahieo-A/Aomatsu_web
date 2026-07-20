/**
 * テストベンチ（中核機能② / B-01〜B-05）。
 * 登録済みの陽性例(expected=true)・陰性例(expected=false)を P-01 に判定させ、正答率を出す。
 * - B-02: self-consistency(3回) の有無を切り替え可能
 * - B-03: 誤判定された例文と votes/evidence を返す
 * - B-04: 保存しない一時例文(extra_positive/extra_negative)を混ぜて試せる
 * - B-05: 結果を test_results に記録
 */
import { NextResponse } from "next/server";
import { render, PROMPT_CONFIG } from "@zdp/prompts";
import { getItem, upsertItem } from "@/lib/store";
import { judgeP01, isMockMode } from "@/lib/gemini";

export const runtime = "nodejs";

interface TrialResult {
  sentence: string;
  expected: boolean;
  got: boolean;
  correct: boolean;
  evidence: string;
  votes: Record<string, number>;
  temporary: boolean;
}

export async function POST(req: Request) {
  const { item_id, use_consistency, extra_positive, extra_negative } =
    await req.json();
  const item = await getItem(item_id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  const runs = use_consistency ? PROMPT_CONFIG["P-01"].selfConsistency : 1;
  const itemView = {
    id: item.id,
    name: item.name,
    criteria: item.criteria,
    patterns: item.patterns,
    positive_examples: item.positive_examples.slice(0, 3),
    negative_examples: item.negative_examples.slice(0, 2),
  };

  const trials: { sentence: string; expected: boolean; temporary: boolean }[] = [
    ...item.positive_examples.map((e) => ({ sentence: e.sentence, expected: true, temporary: false })),
    ...item.negative_examples.map((e) => ({ sentence: e.sentence, expected: false, temporary: false })),
    ...((extra_positive as string[]) || []).map((s) => ({ sentence: s, expected: true, temporary: true })),
    ...((extra_negative as string[]) || []).map((s) => ({ sentence: s, expected: false, temporary: true })),
  ];

  const results: TrialResult[] = [];
  for (const t of trials) {
    const prompt = render("P-01", { sentence: t.sentence, item: itemView });
    const { contains, evidence, votes } = await judgeP01({
      itemId: item.id,
      prompt,
      temperature: PROMPT_CONFIG["P-01"].temperature,
      runs,
      expected: t.expected,
      seedText: t.sentence,
    });
    results.push({
      sentence: t.sentence,
      expected: t.expected,
      got: contains,
      correct: contains === t.expected,
      evidence,
      votes,
      temporary: t.temporary,
    });
  }

  // 保存対象（temporary除く）だけで精度を測る
  const saved = results.filter((r) => !r.temporary);
  const correct = saved.filter((r) => r.correct).length;
  const accuracy = saved.length > 0 ? correct / saved.length : 0;

  // B-05: test_results に記録
  item.test_results = {
    last_tested_at: new Date().toISOString(),
    accuracy: Number(accuracy.toFixed(3)),
    runs: saved.length,
  };
  await upsertItem(item);

  return NextResponse.json({
    item_id,
    mock: isMockMode(),
    accuracy,
    runs: saved.length,
    correct,
    total: saved.length,
    misjudged: results.filter((r) => !r.correct),
    results,
  });
}
