/**
 * インポート（IO-02）。バックアップ復元・他環境からの取り込み。
 * GrammarMasterSchema で検証し、working を差し替える（保存前に自動バックアップ）。
 */
import { NextResponse } from "next/server";
import { GrammarMasterSchema } from "@zdp/schema";
import { saveWorking } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = GrammarMasterSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "スキーマ検証に失敗: " + parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    await saveWorking(parsed.data);
    return NextResponse.json({ ok: true, total: parsed.data.items.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
