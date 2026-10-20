// 設定の取得。DB が無い・読めないときも既定値で ok:true を返す（生徒画面を止めない）。
import { allowRequest } from "@/lib/server/rate-limit";
import { clientIp, json, loadSettings } from "@/lib/server/api";
import { getRepo } from "@/lib/server/db";
import { DEFAULT_SETTINGS } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!allowRequest(`settings:${clientIp(req)}`, 120, 60_000)) {
    return json({ ok: false, error: "アクセスが多すぎます。少し待ってください。" }, 429);
  }
  try {
    return json({ ok: true, data: await loadSettings(getRepo()) });
  } catch (err) {
    console.error("[api/settings]", err instanceof Error ? err.message : "unknown error");
    return json({ ok: true, data: DEFAULT_SETTINGS });
  }
}
