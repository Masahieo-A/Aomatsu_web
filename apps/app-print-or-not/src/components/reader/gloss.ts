// 語注の対象語を本文中から探すための補助。変化形（forms）も同じ語注にひもづける。
import type { GlossaryItem } from "@/lib/types";

export interface GlossToken {
  text: string;
  item?: GlossaryItem; // あれば語注ボタンにする
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tokenizeGloss(
  text: string,
  glossary: GlossaryItem[],
): GlossToken[] {
  const map = new Map<string, GlossaryItem>();
  for (const g of glossary) {
    for (const term of [g.word, ...(g.forms ?? [])]) {
      if (term.trim()) map.set(term.toLowerCase(), g);
    }
  }
  if (map.size === 0) return [{ text }];
  // 長い語を先に照合して、句（"care home"）が単語（"care"）に食われないようにする
  const alt = [...map.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join("|");
  const re = new RegExp(`(?<![A-Za-z])(${alt})(?![A-Za-z])`, "gi");
  const parts = text.split(re);
  // split は「キャプチャ部分」が奇数番目に入る
  return parts
    .map((p, i) =>
      i % 2 === 1 ? { text: p, item: map.get(p.toLowerCase()) } : { text: p },
    )
    .filter((t) => t.text !== "");
}
