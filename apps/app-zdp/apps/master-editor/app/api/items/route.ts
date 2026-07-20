/**
 * 項目のCRUD（E-01）。
 * - GET: 全項目
 * - POST: upsert（保存前に循環参照を拒否 G-02、verified昇格条件 B-05 を検査）
 */
import { NextResponse } from "next/server";
import {
  GrammarItemSchema,
  canPromoteToVerified,
  wouldCreateCycle,
} from "@zdp/schema";
import { getItems, upsertItem } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await getItems() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = GrammarItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "スキーマ検証に失敗: " + parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const item = parsed.data;
  const all = await getItems();

  // G-02: 循環参照の検出と保存拒否
  if (wouldCreateCycle(all, { id: item.id, prerequisites: item.prerequisites })) {
    return NextResponse.json(
      { error: "循環参照になるため保存できません（prerequisites を見直してください）" },
      { status: 400 }
    );
  }

  // B-05: verified/published への昇格条件
  if (item.status === "verified" || item.status === "published") {
    const check = canPromoteToVerified(item);
    if (!check.ok) {
      return NextResponse.json(
        {
          error:
            `${item.status} に昇格できません:\n- ` + check.reasons.join("\n- "),
        },
        { status: 400 }
      );
    }
  }

  const saved = await upsertItem(item);
  return NextResponse.json({ ok: true, item: saved });
}
