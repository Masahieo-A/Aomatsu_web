// 英文処理の共通関数（文分割・語数・コピペ判定・伏せ数字の置換）。
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

// 入力の単語のうち、元の文にも同じ順で現れる割合（LCS ベース、0〜1）
export function copyRatio(input: string, original: string): number {
  const a = words(input);
  const b = words(original);
  if (a.length === 0 || b.length === 0) return 0;
  const dp: number[] = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length] / a.length;
}

export const COPY_WARN_RATIO = 0.8;

export function hasJapanese(text: string): boolean {
  return /[぀-ヿ一-龯]/.test(text);
}
