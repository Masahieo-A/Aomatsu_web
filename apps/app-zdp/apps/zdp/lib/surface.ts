/**
 * STEP1（前処理・LLM不使用 / S-02）: 表層パターンで文法項目候補を 5〜10 件に絞る。
 * ブレ最小化アーキテクチャ原則3「候補絞り込みはプログラムで先に行う」。
 *
 * マスタの中身に依存しない設計（要件 §1.2）にするため、正規表現は「構造タグ」を出すに留め、
 * 各タグに紐づく日本語キーワードが item.name / item.criteria に含まれるかでスコアリングする。
 * これにより新しい項目が追加されても、その項目の記述語彙に応じて自動的に候補化される。
 */
import type { GrammarItem } from "@zdp/schema";

interface TagRule {
  tag: string;
  test: RegExp;
  /** この構造に関連する項目を拾うためのキーワード（item.name/criteriaと照合） */
  keywords: string[];
}

const TAG_RULES: TagRule[] = [
  { tag: "comma_participle", test: /,\s*\w+(ed|en|ing)\b[^,]*,/i, keywords: ["分詞構文", "挿入"] },
  { tag: "be_pp", test: /\b(am|is|are|was|were|be|been)\s+\w+(ed|en)\b/i, keywords: ["受動", "過去分詞"] },
  { tag: "have_pp", test: /\b(have|has|had)\s+\w+(ed|en)\b/i, keywords: ["完了"] },
  { tag: "progressive", test: /\b(am|is|are|was|were)\s+\w+ing\b/i, keywords: ["進行"] },
  { tag: "relative", test: /\b(who|whom|whose|which|that)\b/i, keywords: ["関係代名詞", "関係詞"] },
  { tag: "if_conditional", test: /\bif\b/i, keywords: ["仮定", "条件"] },
  { tag: "modal", test: /\b(can|could|will|would|shall|should|may|might|must)\b/i, keywords: ["助動詞"] },
  { tag: "to_infinitive", test: /\bto\s+[a-z]+\b/i, keywords: ["不定詞"] },
  { tag: "gerund", test: /\b\w+ing\b/i, keywords: ["動名詞"] },
  { tag: "comparative", test: /\b(more|most)\b|\b\w+er than\b|\b\w+est\b/i, keywords: ["比較"] },
  { tag: "reported", test: /\b(said|told|thought|asked|explained)\b/i, keywords: ["時制の一致", "話法"] },
  { tag: "participle_attr", test: /\b(broken|written|falling|crying|sleeping|excited|interested)\b/i, keywords: ["分詞", "形容詞用法"] },
];

export interface Candidate {
  item: GrammarItem;
  score: number;
  reasons: string[];
}

const MAX_CANDIDATES = 8;

export function detectCandidates(
  sentence: string,
  items: GrammarItem[]
): Candidate[] {
  const norm = sentence.toLowerCase();
  const activeTags = TAG_RULES.filter((r) => r.test.test(sentence));

  const scored: Candidate[] = items.map((item) => {
    const haystack = `${item.name} ${item.criteria}`;
    const reasons: string[] = [];
    let score = 0;

    // 1) 構造タグ × キーワード一致
    for (const rule of activeTags) {
      if (rule.keywords.some((k) => haystack.includes(k))) {
        score += 2;
        reasons.push(`構造[${rule.tag}]`);
      }
    }
    // 2) item.patterns の literal 部分一致（記号を除いた語の一致）
    for (const p of item.patterns) {
      const tokens = p.toLowerCase().match(/[a-z']{3,}/g) ?? [];
      const hit = tokens.filter((t) => norm.includes(t));
      if (hit.length > 0 && tokens.length > 0) {
        score += Math.min(3, hit.length);
        reasons.push(`パターン語:${hit.join("/")}`);
      }
    }
    return { item, score, reasons };
  });

  let candidates = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  // 何もヒットしない場合でも診断を進められるよう、低レベル項目を少数フォールバック
  if (candidates.length < 3) {
    const fill = scored
      .filter((c) => c.score === 0)
      .sort(
        (a, b) =>
          a.item.prerequisites.length - b.item.prerequisites.length
      )
      .slice(0, 3 - candidates.length)
      .map((c) => ({ ...c, reasons: ["フォールバック候補"] }));
    candidates = [...candidates, ...fill];
  }

  return candidates;
}
