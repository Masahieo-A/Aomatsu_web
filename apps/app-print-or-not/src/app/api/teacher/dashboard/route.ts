// 教員ダッシュボード用データ（分布・Card 一覧・ヒント Top3）。
import { json, loadSettings } from "@/lib/server/api";
import { buildDashboard } from "@/lib/server/dashboard";
import { handleTeacher } from "@/lib/server/teacher-auth";
import { parseOptionalClassId } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return handleTeacher(req, "api/teacher/dashboard", async ({ body, repo }) => {
    const classId = parseOptionalClassId(body.classId);
    if (!classId.ok) return json({ ok: false, error: classId.error }, 400);
    const settings = await loadSettings(repo);
    return json({ ok: true, data: await buildDashboard(repo, settings, classId.value) });
  });
}
