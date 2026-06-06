/**
 * GET /api/dictionary/ja-en?q=感動&pos=名詞
 * Jisho.org API を経由して日本語→英語の候補と例文を返す。
 * Jisho は無料・認証不要のパブリック API。
 */
import { NextResponse } from "next/server";

export const runtime = "edge";

type JishoSense = {
  english_definitions: string[];
  parts_of_speech: string[];
  sentences?: { en: string; ja: string }[];
};

type JishoEntry = {
  slug: string;
  is_common: boolean | null;
  japanese: { word?: string; reading?: string }[];
  senses: JishoSense[];
};

type JishoResponse = {
  data: JishoEntry[];
};

const POS_MAP: Record<string, string> = {
  名詞: "Noun",
  動詞: "Verb",
  形容詞: "Adjective",
  副詞: "Adverb",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const pos = searchParams.get("pos") ?? "";

  if (!q) {
    return NextResponse.json({ error: "q パラメータが必要です" }, { status: 400 });
  }
  if (q.length > 50) {
    return NextResponse.json({ error: "検索語が長すぎます" }, { status: 400 });
  }

  try {
    const url = `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AomatsuEnglishTools/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "辞書サービスに接続できません" }, { status: 502 });
    }

    const json = (await res.json()) as JishoResponse;
    const entries = json.data ?? [];

    // 品詞フィルタ（英語品詞名にマッピング）
    const targetPos = POS_MAP[pos] ?? "";

    const results = entries
      .slice(0, 8)
      .flatMap((entry) =>
        entry.senses
          .filter((sense) => {
            if (!targetPos) return true;
            return sense.parts_of_speech.some((p) =>
              p.toLowerCase().includes(targetPos.toLowerCase())
            );
          })
          .slice(0, 2)
          .map((sense) => ({
            word: sense.english_definitions.slice(0, 3).join(", "),
            pos: sense.parts_of_speech[0] ?? "",
            reading: entry.japanese[0]?.reading ?? "",
          }))
      )
      .filter((r) => r.word)
      .slice(0, 6);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "辞書の取得に失敗しました" }, { status: 500 });
  }
}
