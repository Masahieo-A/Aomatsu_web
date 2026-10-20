// 「自分の側」の判定。立場メーター（1〜5）から決める。
import type { Side, StudentState } from "./types";

export function sideOfStance(stance: number | undefined): Side | undefined {
  if (stance === undefined) return undefined;
  if (stance <= 2) return "pro";
  if (stance >= 4) return "con";
  return undefined;
}

export function otherSide(side: Side): Side {
  return side === "pro" ? "con" : "pro";
}

// 読んだ後の立場（Stance Check）を優先。3（未決）なら、それ以前の側をそのまま使う。
export function mySide(s: StudentState): Side | undefined {
  return sideOfStance(s.stanceAfter) ?? sideOfStance(s.stanceBefore) ?? s.firstSide;
}
