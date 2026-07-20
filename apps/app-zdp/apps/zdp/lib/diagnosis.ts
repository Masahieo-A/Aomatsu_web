/**
 * STEP4 原因特定: 正誤 × 確信度 の4象限分類（Corder の誤り分析）。
 * 同一項目で2回以上の安定した error_candidate → Error 確定。
 */
import type { Quadrant } from "./repository/types";

/** 確信度の高低しきい値（1〜5のうち4以上を高確信とみなす） */
export const CONFIDENCE_THRESHOLD = 4;

export function classifyQuadrant(
  isCorrect: boolean,
  confidence: number
): Quadrant {
  const high = confidence >= CONFIDENCE_THRESHOLD;
  if (isCorrect) return high ? "mastered" : "zpd";
  return high ? "error_candidate" : "mistake_candidate";
}

export interface ItemOutcome {
  item_id: string;
  quadrant: Quadrant;
}

/**
 * 項目ごとの安定誤りを集計し、Error確定項目を返す。
 * error_candidate が2回以上 → Error確定。
 */
export function detectStableErrors(outcomes: ItemOutcome[]): {
  errorItems: string[];
  zpdItems: string[];
} {
  const errCount = new Map<string, number>();
  const zpdSet = new Set<string>();
  for (const o of outcomes) {
    if (o.quadrant === "error_candidate") {
      errCount.set(o.item_id, (errCount.get(o.item_id) ?? 0) + 1);
    } else if (o.quadrant === "zpd") {
      zpdSet.add(o.item_id);
    }
  }
  const errorItems = [...errCount.entries()]
    .filter(([, n]) => n >= 2)
    .map(([id]) => id);
  // 1回だけの error_candidate も、他に強い候補が無ければ拾えるよう保持
  const singleErrors = [...errCount.entries()]
    .filter(([, n]) => n === 1)
    .map(([id]) => id);
  return {
    errorItems: errorItems.length > 0 ? errorItems : singleErrors,
    zpdItems: [...zpdSet],
  };
}

/**
 * 前提グラフを遡り、「どこまで戻れば足場が届くか」を求める（ZPDの操作的定義）。
 * error 項目の prerequisites のうち、まだ mastered でないものを足場候補として返す。
 */
export function scaffoldPath(
  errorItemId: string,
  itemsById: Map<string, { id: string; prerequisites: string[] }>,
  masteredIds: Set<string>
): string[] {
  const path: string[] = [];
  const visit = (id: string) => {
    const item = itemsById.get(id);
    if (!item) return;
    for (const pre of item.prerequisites) {
      if (!masteredIds.has(pre) && !path.includes(pre)) {
        path.push(pre);
        visit(pre);
      }
    }
  };
  visit(errorItemId);
  return path;
}
