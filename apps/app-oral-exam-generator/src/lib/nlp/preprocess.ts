import fs from "fs";
import path from "path";
import winkNLP, {
  type ItemSentence,
  type ItemToken,
  type ItsFunction,
} from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { parseCsv } from "@/lib/csv";
import type { Analysis } from "@/types";

// ---------------------------------------------------------------------------
// 定数（要件定義 §7.1：リストは定数化する）
// ---------------------------------------------------------------------------

/** バリデーション基準（既定：30〜300語・3文以上） */
export const VALIDATION = {
  MIN_WORDS: 30,
  MAX_WORDS: 300,
  MIN_SENTENCES: 3,
} as const;

/** 出題アンカー候補となる代名詞 */
const PRONOUNS = [
  "it",
  "its",
  "they",
  "them",
  "their",
  "theirs",
  "this",
  "that",
  "these",
  "those",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "one",
  "ones",
] as const;

/** 出題アンカー候補となる談話標識 */
const DISCOURSE_MARKERS = [
  "However",
  "Therefore",
  "For example",
  "For instance",
  "Moreover",
  "Furthermore",
  "In addition",
  "On the other hand",
  "As a result",
  "In conclusion",
  "In contrast",
  "Nevertheless",
  "In fact",
  "Instead",
  "Besides",
  "First",
  "Second",
  "Third",
  "Finally",
  "Also",
] as const;

/** このレベル以下の語は「基準内」とみなす（超えるか未収載なら difficult_words 行き） */
const BASE_LEVEL = "B1";
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

const nlp = winkNLP(model);

// ---------------------------------------------------------------------------
// 語彙リスト（data/wordlist.csv：word,level）
// ---------------------------------------------------------------------------

let wordlistCache: Map<string, string> | null = null;

export function loadWordlist(): Map<string, string> {
  if (wordlistCache) return wordlistCache;
  const map = new Map<string, string>();
  const file = path.join(process.cwd(), "data", "wordlist.csv");
  if (fs.existsSync(file)) {
    const rows = parseCsv(fs.readFileSync(file, "utf-8"));
    for (const row of rows) {
      const [word, level] = [row[0]?.trim().toLowerCase(), row[1]?.trim()];
      if (!word || word === "word" || !level) continue;
      map.set(word, level.toUpperCase());
    }
  }
  wordlistCache = map;
  return map;
}

function exceedsBaseLevel(level: string): boolean {
  const idx = LEVEL_ORDER.indexOf(level);
  // リスト未収載（レベル不明）は高難度扱い（要件定義 §7.1）
  if (idx === -1) return true;
  return idx > LEVEL_ORDER.indexOf(BASE_LEVEL);
}

// ---------------------------------------------------------------------------
// 前処理本体（LLM不使用）
// ---------------------------------------------------------------------------

export function preprocess(text: string): Analysis {
  const validation_errors: string[] = [];

  // 日本語混入チェック
  if (/[぀-ヿ一-鿿]/.test(text)) {
    validation_errors.push("日本語（ひらがな・カタカナ・漢字）が含まれています");
  }

  const doc = nlp.readDoc(text);
  const its = nlp.its;

  // 文分割（文番号は1始まり）
  const sentences: { index: number; text: string }[] = [];
  doc.sentences().each((s: ItemSentence) => {
    sentences.push({ index: sentences.length + 1, text: s.out().trim() });
  });

  // 単語数（記号・約物を除くトークン）
  const word_count = doc
    .tokens()
    .filter((t) => t.out(its.type) === "word")
    .length();

  if (word_count < VALIDATION.MIN_WORDS) {
    validation_errors.push(
      `単語数が少なすぎます（${word_count}語 / 最低${VALIDATION.MIN_WORDS}語）`
    );
  }
  if (word_count > VALIDATION.MAX_WORDS) {
    validation_errors.push(
      `単語数が多すぎます（${word_count}語 / 上限${VALIDATION.MAX_WORDS}語）`
    );
  }
  if (sentences.length < VALIDATION.MIN_SENTENCES) {
    validation_errors.push(
      `文の数が少なすぎます（${sentences.length}文 / 最低${VALIDATION.MIN_SENTENCES}文）`
    );
  }

  // 代名詞・談話標識の座標抽出（文番号＋文内文字オフセット）
  const anchors: Analysis["anchors"] = [];
  for (const sentence of sentences) {
    for (const pronoun of PRONOUNS) {
      const re = new RegExp(`\\b${pronoun}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(sentence.text)) !== null) {
        anchors.push({
          type: "pronoun",
          word: m[0],
          sentence_index: sentence.index,
          char_offset: m.index,
        });
      }
    }
    for (const marker of DISCOURSE_MARKERS) {
      const re = new RegExp(
        `\\b${marker.replace(/ /g, "\\s+")}\\b`,
        "gi"
      );
      let m: RegExpExecArray | null;
      while ((m = re.exec(sentence.text)) !== null) {
        anchors.push({
          type: "marker",
          word: m[0],
          sentence_index: sentence.index,
          char_offset: m.index,
        });
      }
    }
  }
  anchors.sort(
    (a, b) => a.sentence_index - b.sentence_index || a.char_offset - b.char_offset
  );

  // 語彙レベル判定
  const wordlist = loadWordlist();
  const difficult_words: Analysis["difficult_words"] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    const sdoc = nlp.readDoc(sentence.text);
    sdoc.tokens().each((t: ItemToken) => {
      if (t.out(its.type) !== "word") return;
      const raw = t.out();
      const lower = raw.toLowerCase();
      // 3文字未満・数字・固有名詞的な語（文中大文字始まり）は対象外にしてノイズを抑える
      if (lower.length < 3) return;
      if (/^[A-Z]/.test(raw) && t.out(its.precedingSpaces) !== "") return;
      if (seen.has(lower)) return;
      // 表層形 → 原形（レンマ）の順で照合（wordlist は見出し語のため）
      // its.lemma の型定義が out() と不整合のためキャストする（実行時は正常動作）
      const lemma = t
        .out(its.lemma as unknown as ItsFunction<string>)
        .toLowerCase();
      const level = wordlist.get(lower) ?? wordlist.get(lemma) ?? "unknown";
      if (exceedsBaseLevel(level)) {
        seen.add(lower);
        difficult_words.push({
          word: raw,
          level,
          sentence_index: sentence.index,
        });
      }
    });
  }

  return {
    sentences,
    anchors,
    difficult_words,
    word_count,
    validation_errors,
  };
}

/** 文番号つき本文（プロンプトのプレースホルダー展開用） */
export function textWithSentenceNumbers(analysis: Analysis): string {
  return analysis.sentences.map((s) => `[${s.index}] ${s.text}`).join("\n");
}
