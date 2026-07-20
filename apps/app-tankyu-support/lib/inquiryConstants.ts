/** 9分野（X軸の入口） */
export const GENRES = [
  "福祉",
  "健康",
  "労働",
  "教育",
  "環境",
  "食",
  "情報",
  "伝統文化",
  "経済"
] as const;

/** 副次的レンズ（Y軸）— システムプロンプト・UI と一致させる */
export const LENSES = [
  "心理学",
  "テクノロジー",
  "ジェンダー",
  "デザイン",
  "言語",
  "マスメディア",
  "インフラ"
] as const;

export type Genre = (typeof GENRES)[number];
export type Lens = (typeof LENSES)[number];

export function isLensLabel(s: string): boolean {
  return (LENSES as readonly string[]).includes(s.trim());
}
