/** 単一項目の取得・削除。IDは永続契約のため物理削除は memo/draft のみ許可し、
 *  それ以外は deprecated 化を促す（要件 §2 の ID 規約）。 */
import { NextResponse } from "next/server";
import { getItem, loadWorking, saveWorking } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const item = await getItem(params.id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const master = await loadWorking();
  const item = master.items.find((i) => i.id === params.id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (item.status !== "memo" && item.status !== "draft") {
    return NextResponse.json(
      {
        error:
          "発行済みIDは削除できません（ZDPアプリの履歴が参照します）。status を deprecated にしてください。",
      },
      { status: 400 }
    );
  }
  master.items = master.items.filter((i) => i.id !== params.id);
  await saveWorking(master);
  return NextResponse.json({ ok: true });
}
