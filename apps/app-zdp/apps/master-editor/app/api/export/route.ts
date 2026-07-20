/**
 * エクスポート（IO-01 / §6）。
 * published のみを対象に V-1〜V-4 を検証し、全通過時のみ grammar_master.json を生成。
 * exports/ に grammar_master_v{n}_{日付}.json（上書きしない）と grammar_master_latest.json を保存。
 * 検証失敗時は 422 で issues を返し、ファイルは生成しない（1つでも失敗したら中止）。
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildExport } from "@zdp/schema";
import { getItems, paths } from "@/lib/store";

export const runtime = "nodejs";
// 常に現在の working ファイルを読む（静的プリレンダのキャッシュを防ぐ）
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getItems();
  const result = buildExport(items);

  if (!result.ok || !result.master) {
    return NextResponse.json(
      { ok: false, issues: result.issues },
      { status: 422 }
    );
  }

  // exports/ に保存
  const { EXPORTS } = paths();
  await fs.mkdir(EXPORTS, { recursive: true });
  const existing = (await fs.readdir(EXPORTS).catch(() => [])).filter((f) =>
    /^grammar_master_v\d+_/.test(f)
  );
  const n = existing.length + 1;
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `grammar_master_v${n}_${date}.json`;
  const json = JSON.stringify(result.master, null, 2);
  await fs.writeFile(path.join(EXPORTS, fileName), json, "utf8");
  await fs.writeFile(
    path.join(EXPORTS, "grammar_master_latest.json"),
    json,
    "utf8"
  );

  return NextResponse.json({
    ok: true,
    saved_as: fileName,
    total: result.master.items.length,
    schema_version: result.master.schema_version,
    master: result.master,
  });
}
