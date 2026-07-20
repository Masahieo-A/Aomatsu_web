/**
 * STEP1（前処理・LLM不使用 / S-01）: CEFR-J Wordlist による語彙難易度判定。
 * 同梱の data/cefrj-wordlist.sample.csv を照合する。
 * 本番では正式な CEFR-J Wordlist（要ライセンス表記・README参照）に差し替える。
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const CSV_PATH = path.join(process.cwd(), "data", "cefrj-wordlist.sample.csv");

export const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVEL_ORDER)[number];

function rank(level: string): number {
  const i = LEVEL_ORDER.indexOf(level as Level);
  return i < 0 ? LEVEL_ORDER.length : i; // 未知語は最上位扱い
}

let wordMap: Map<string, Level> | null = null;

async function loadWordlist(): Promise<Map<string, Level>> {
  if (wordMap) return wordMap;
  const map = new Map<string, Level>();
  try {
    const raw = await fs.readFile(CSV_PATH, "utf8");
    for (const line of raw.split(/\r?\n/).slice(1)) {
      const [word, level] = line.split(",");
      if (word && level) map.set(word.trim().toLowerCase(), level.trim() as Level);
    }
  } catch {
    // 見つからなければ空マップ（未知語=難単語として扱われる）
  }
  wordMap = map;
  return map;
}

export interface VocabWord {
  word: string;
  level: Level | "unknown";
  aboveTarget: boolean;
}

/**
 * 文中の語を難易度判定し、targetLevel を超える語（＝語彙プローブ候補）を返す。
 * 固有名詞（先頭大文字で文頭以外）や短い機能語は除外する。
 */
export async function analyzeVocab(
  sentence: string,
  targetLevel: Level
): Promise<{ words: VocabWord[]; difficult: VocabWord[] }> {
  const map = await loadWordlist();
  const target = rank(targetLevel);
  const tokens = sentence.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const seen = new Set<string>();
  const words: VocabWord[] = [];

  tokens.forEach((tok, idx) => {
    const lower = tok.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    // 文頭以外の大文字始まり = 固有名詞とみなしスキップ
    if (idx > 0 && /^[A-Z]/.test(tok)) return;
    if (lower.length <= 2) return;
    const level = map.get(lower);
    const w: VocabWord = {
      word: tok,
      level: level ?? "unknown",
      aboveTarget: level ? rank(level) > target : lower.length > 6, // 未知語は長ければ難と推定
    };
    words.push(w);
  });

  return { words, difficult: words.filter((w) => w.aboveTarget) };
}
