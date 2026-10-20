// アプリ全体の型定義。記事JSON・生徒データ・API の約束事はここが正本。

export type Side = "pro" | "con";
export type AuthorType = "university" | "government" | "company" | "media" | "journal";

export interface Source {
  title: string; // 元記事タイトル原文
  publisher: string;
  date: string; // YYYY-MM-DD（月までしか分からない場合は YYYY-MM）
  url: string;
  lang: "en" | "ja";
  authorType: AuthorType;
  biasNote: string; // 「その立場ゆえの偏りの可能性」日本語1行
}

export interface Paragraph {
  text: string; // 本文。伏せ数字は {{hidden:0}} の形で埋め込む
  hints: [string, string, string]; // [キーワード3つ, 要旨（日本語1文）, 全訳]
}

export type LevelKey = "lv1" | "lv2" | "lv3";

export interface Level {
  paragraphs: Paragraph[];
}

export interface GlossaryItem {
  word: string; // 見出し語
  forms?: string[]; // 本文中に出る変化形（swallowing など）
  easyEn: string; // 易しい英英説明
  ja: string;
}

export interface HiddenNumber {
  paragraph: number; // Lv1 の段落インデックス（0始まり）
  answer: number;
  unit: string; // "%" "yen" "minutes" など
  display: string; // 公開後に本文へ入る表記（"about half" "125,000 dollars"）
  label: string; // 何の数か（英語）
  choices?: number[]; // 選択肢。無い場合はスライダー
  min?: number;
  max?: number;
}

export interface FactOpinionItem {
  sentence: string; // Lv1 本文中の文そのまま
  answer: "fact" | "opinion";
  explain: string; // 日本語で理由1文
}

export interface Article {
  id: string; // "pro-01" など
  side: Side;
  hookTitle: string; // 問いの形の見出し
  hookTitleJa: string; // 見出しの日本語訳
  summaryJa: string; // 記事の内容（日本語1〜2文。一覧・検索用）
  point: string; // 主な論点 ID（points.json）
  difficulty: 1 | 2 | 3;
  minutes: number;
  sources: Source[];
  // lv1=簡単（英検準2級）、lv2=普通（英検2級）、lv3=難しい（大学入学共通テスト）
  levels: { lv1: Level; lv2: Level; lv3: Level };
  glossary: GlossaryItem[];
  hiddenNumbers: HiddenNumber[];
  factOpinion: FactOpinionItem[];
  cardPoints: string[]; // 記事が扱う論点（points.json の ID。検索に使う）
}

export interface PointDef {
  id: string;
  side: Side;
  en: string;
  ja: string;
}

// ---- 生徒データ ----

export interface HintEvent {
  articleId: string;
  level: LevelKey;
  paragraph: number;
  hint: 1 | 2 | 3;
  at: string;
}

export interface WritingDraft {
  outline: {
    opinion: string;
    reason1: string;
    reason2: string;
    counter: string;
    conclusion: string;
  };
  body: string;
  checks: boolean[]; // セルフチェック（語数以外の6項目）
  completedAt?: string;
}

export interface StudentState {
  version: 1;
  stanceBefore?: number; // 1〜5（1=広めるべき, 5=制限すべき）
  stanceAfter?: number;
  stanceReason?: string;
  firstSide?: Side; // stance=3 の生徒が S2 で選んだ「まず読む側」
  hookDone: boolean;
  hookAnswers: Record<string, string>; // 問題ID → 生徒の答え
  guesses: Record<string, number>; // "articleId:index" → 予想値
  factOpinionAnswers: Record<string, ("fact" | "opinion")[]>;
  sortDone: boolean;
  trapDone: boolean;
  hintCounts: Record<string, number>; // "articleId:level:paragraph:hint" → 回数
  draft?: WritingDraft;
}

export interface Settings {
  wordMin: number;
  wordMax: number;
}

