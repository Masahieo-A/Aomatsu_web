import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { buildWorksheetSource } from "@/lib/worksheet/source";

export const runtime = "edge";

// GET /api/teacher/worksheet/[unitId] — グループ準備プリントの材料（practice 問題のみ・教員専用）
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  if (user.role !== "teacher") return NextResponse.json({ error: "教員権限が必要です" }, { status: 403 });
  const { unitId } = await params;
  const source = buildWorksheetSource(decodeURIComponent(unitId));
  if (!source) return NextResponse.json({ error: "単元が見つかりません" }, { status: 404 });
  return NextResponse.json(source, { headers: { "Cache-Control": "private, no-store" } });
}
