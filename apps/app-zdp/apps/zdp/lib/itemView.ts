/**
 * マスタ項目からプロンプト注入用の値を作る。
 * few-shot 注入は陽性例3件・陰性例2件まで（共通実装規約3・トークン節約）。
 */
import type { GrammarItem } from "@zdp/schema";

export function promptItem(item: GrammarItem) {
  return {
    id: item.id,
    name: item.name,
    criteria: item.criteria,
    patterns: item.patterns,
    positive_examples: item.positive_examples.slice(0, 3),
    negative_examples: item.negative_examples.slice(0, 2),
    common_misconceptions: item.common_misconceptions,
    probe_template: item.probe_template,
  };
}
