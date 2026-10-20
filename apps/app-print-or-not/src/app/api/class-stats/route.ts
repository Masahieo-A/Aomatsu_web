// 匿名のクラス別・前後の立場分布（S6 用）。出席番号は一切返さない。
import { allowRequest } from "@/lib/server/rate-limit";
import { clientIp, json, loadSettings, noDbResponse, serverError } from "@/lib/server/api";
import { getRepo } from "@/lib/server/db";
import { parseOptionalClassId } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    if (!allowRequest(`stats:${clientIp(req)}`, 120, 60_000)) {
      return json({ ok: false, error: "アクセスが多すぎます。少し待ってください。" }, 429);
    }
    const repo = getRepo();
    if (!repo) return noDbResponse();

    const classId = parseOptionalClassId(new URL(req.url).searchParams.get("classId"));
    if (!classId.ok) return json({ ok: false, error: classId.error }, 400);
    if (classId.value) {
      const settings = await loadSettings(repo);
      if (!settings.classes.includes(classId.value)) return json({ ok: false, error: "クラスが正しくありません" }, 400);
    }
    return json({ ok: true, data: await repo.getStats(classId.value) });
  } catch (err) {
    return serverError(err, "api/class-stats");
  }
}
