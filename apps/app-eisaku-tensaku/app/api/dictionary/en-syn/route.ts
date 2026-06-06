/**
 * GET /api/dictionary/en-syn?q=happy
 * Datamuse API を経由して英語の類義語と短い定義を返す。
 * Datamuse は無料・認証不要のパブリック API。
 */
import { NextResponse } from "next/server";

export const runtime = "edge";

type DatamuseWord = {
  word: string;
  score: number;
  defs?: string[];
  tags?: string[];
};

/** Datamuse の品詞タグを日本語ラベルに変換 */
function posLabel(tags: string[] = []): string {
  if (tags.includes("n")) return "noun";
  if (tags.includes("v")) return "verb";
  if (tags.includes("adj")) return "adjective";
  if (tags.includes("adv")) return "adverb";
  return "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "q パラメータが必要です" }, { status: 400 });
  }
  if (q.length > 50) {
    return NextResponse.json({ error: "検索語が長すぎます" }, { status: 400 });
  }

  try {
    // rel_syn: 類義語、md=dp: 定義と品詞タグ、max=8
    const url = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(q)}&md=dp&max=8`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({ error: "辞書サービスに接続できません" }, { status: 502 });
    }

    const words = (await res.json()) as DatamuseWord[];

    const results = words
      .slice(0, 6)
      .map((w) => ({
        word: w.word,
        pos: posLabel(w.tags),
        def: w.defs?.[0]?.replace(/^[a-z]\t/, "") ?? "",
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "辞書の取得に失敗しました" }, { status: 500 });
  }
}
