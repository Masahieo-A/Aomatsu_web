// 課題終了後の全生徒データ削除（students, cards, hint_logs）。設定は消さない。
import { json } from "@/lib/server/api";
import { handleTeacher } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return handleTeacher(req, "api/teacher/purge", async ({ body, repo }) => {
    if (body.confirm !== "DELETE") {
      return json({ ok: false, error: "確認のため DELETE と入力してください" }, 400);
    }
    return json({ ok: true, data: await repo.purgeAll() });
  });
}
