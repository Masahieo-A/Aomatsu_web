/**
 * T-02: grammar_master.json のメタ取得とアップロード差し替え。
 * アップロード時はスキーマ検証とバージョン照合を行う（§6.4）。
 */
import { NextResponse } from "next/server";
import { masterMeta, saveUploadedMaster } from "@/lib/master";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await masterMeta());
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const master = await saveUploadedMaster(json);
    return NextResponse.json({
      ok: true,
      total: master.items.length,
      published: master.items.filter((i) => i.status === "published").length,
      schema_version: master.schema_version,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 }
    );
  }
}
