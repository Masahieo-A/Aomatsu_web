// 英文処理の共通関数（文分割・語数・伏せ数字の置換）。
import type { Article } from "./types";

const HIDDEN_RE = /\{\{hidden:(\d+)\}\}/g;

// 伏せ数字 {{hidden:i}} を、公開済みなら display、未公開なら ？？？ にする
export function fillHidden(text: string, article: Article, revealed: (index: number) => boolean): string {
  return text.replace(HIDDEN_RE, (_, i: string) => {
    const idx = Number(i);
    const h = article.hiddenNumbers[idx];
    if (!h) return "";
    return revealed(idx) ? h.display : "？？？";
  });
}

export function hiddenIndexesIn(text: string): number[] {
  return [...text.matchAll(HIDDEN_RE)].map((m) => Number(m[1]));
}

// 本文を文に分ける。記事側で「Dr.」「U.K.」のようなピリオド付き略語は使わない約束。
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?]["”’)]?)\s+(?=["“(A-Z0-9{])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^a-z0-9'%]+/)
    .filter(Boolean);
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length : 0;
}

export function hasJapanese(text: string): boolean {
  return /[぀-ヿ一-龯]/.test(text);
}
