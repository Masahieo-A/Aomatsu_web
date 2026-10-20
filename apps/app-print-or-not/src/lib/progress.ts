// 「自分の側」とゲート条件（Writing Builder を開ける条件）の判定。
// 画面ごとに数え方がずれないよう、判定はすべてここに集める。
import type { Settings, Side, StudentState } from "./types";

export function sideOfStance(stance: number | undefined): Side | undefined {
  if (stance === undefined) return undefined;
  if (stance <= 2) return "pro";
  if (stance >= 4) return "con";
  return undefined;
}

export function otherSide(side: Side): Side {
  return side === "pro" ? "con" : "pro";
}

// S6 で選び直した側を優先。S6 が 3（未決）なら、それ以前の側をそのまま使う。
export function mySide(s: StudentState): Side | undefined {
  return sideOfStance(s.stanceAfter) ?? sideOfStance(s.stanceBefore) ?? s.firstSide;
}

export function cardCounts(s: StudentState): { mine: number; other: number } {
  const side = mySide(s);
  const cards = Object.values(s.cards);
  if (!side) return { mine: 0, other: 0 };
  return {
    mine: cards.filter((c) => c.side === side).length,
    other: cards.filter((c) => c.side !== side).length,
  };
}

export const NEED_MINE = 2;
export const NEED_OTHER = 1;

export interface GateItem {
  key: "mine" | "other" | "sort" | "stance" | "trap";
  label: string;
  done: boolean;
  href: string;
}

export function gateItems(s: StudentState, settings: Settings): GateItem[] {
  const { mine, other } = cardCounts(s);
  const items: GateItem[] = [
    { key: "mine", label: `自分の側の Evidence Card ${Math.min(mine, NEED_MINE)}/${NEED_MINE}`, done: mine >= NEED_MINE, href: "/" },
    { key: "other", label: `反対側の Evidence Card ${Math.min(other, NEED_OTHER)}/${NEED_OTHER}`, done: other >= NEED_OTHER, href: "/" },
    { key: "sort", label: "Emotion or Evidence?", done: s.sortDone, href: "/sort" },
    { key: "stance", label: "Stance Check（立場の再表明）", done: s.stanceAfter !== undefined, href: "/stance" },
  ];
  if (settings.trapRequired) {
    items.push({ key: "trap", label: "Trap or Treasure?", done: s.trapDone, href: "/trap" });
  }
  return items;
}

export function isWritingUnlocked(s: StudentState, settings: Settings): boolean {
  return gateItems(s, settings).every((i) => i.done);
}

// 「あと○本」表示用
export function cardsRemaining(s: StudentState): number {
  const { mine, other } = cardCounts(s);
  return Math.max(0, NEED_MINE - mine) + Math.max(0, NEED_OTHER - other);
}
