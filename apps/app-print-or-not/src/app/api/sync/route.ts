// 生徒端末からの保存（立場・Card・ヒント）。DB への書き込みはここだけを通す。
import { allowRequest } from "@/lib/server/rate-limit";
import { clientIp, json, loadSettings, noDbResponse, readJsonBody, serverError } from "@/lib/server/api";
import { getRepo } from "@/lib/server/db";
import { parseSync } from "@/lib/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    if (!allowRequest(`sync:${clientIp(req)}`, 120, 60_000)) {
      return json({ ok: false, error: "送信が多すぎます。少し待つと自動で再送します。" }, 429);
    }
    const repo = getRepo();
    if (!repo) return noDbResponse();

    const body = await readJsonBody(req, 20_000);
    if (body === undefined) return json({ ok: false, error: "送信内容を読み取れませんでした" }, 400);

    const settings = await loadSettings(repo);
    const parsed = parseSync(body, settings.classes);
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);

    const v = parsed.value;
    if (v.kind === "stance") await repo.upsertStance(v.classId, v.number, v.patch);
    else if (v.kind === "card") await repo.upsertCard(v.card);
    else await repo.addHint(v.hint);
    return json({ ok: true });
  } catch (err) {
    return serverError(err, "api/sync");
  }
}
