// 設定の保存（クラス一覧・So what 日本語可・目標語数・Trap or Treasure 必須）。
import { invalidateSettingsCache, json } from "@/lib/server/api";
import { handleTeacher } from "@/lib/server/teacher-auth";
import { parseSettings } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return handleTeacher(req, "api/teacher/settings", async ({ body, repo }) => {
    const parsed = parseSettings(body.settings);
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
    await repo.saveSettings(parsed.value);
    invalidateSettingsCache();
    return json({ ok: true, data: parsed.value });
  });
}
