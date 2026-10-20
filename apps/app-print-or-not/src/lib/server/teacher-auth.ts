// 教員 API の認証。サーバー専用（クライアントから import しない）。
// パスコードは環境変数 TEACHER_PASSCODE。比較は定数時間、失敗は IP ごとに数えてロックする。
import { createHash, timingSafeEqual } from "node:crypto";
import type { Repo } from "./db";
import { getRepo } from "./db";
import { clientIp, json, noDbResponse, readJsonBody, serverError } from "./api";

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

const fails = new Map<string, { count: number; lockedUntil: number }>();

function safeEqual(a: string, b: string): boolean {
  // 長さの違いが比較時間に出ないよう、ハッシュ化してから同じ長さで比べる
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export interface TeacherContext {
  body: Record<string, unknown>;
  repo: Repo;
}

/**
 * 教員 API の共通処理: 設定確認 → ロック確認 → パスコード照合 → DB 確認 → 本処理。
 * 本処理で投げられた例外はここで日本語の汎用エラーにする。
 */
export async function handleTeacher(
  req: Request,
  route: string,
  run: (ctx: TeacherContext) => Promise<Response>,
): Promise<Response> {
  try {
    const expected = process.env.TEACHER_PASSCODE ?? "";
    if (expected.length < 8) {
      return json({ ok: false, error: "TEACHER_PASSCODE が未設定です（8文字以上を環境変数に設定してください）" }, 503);
    }

    const ip = clientIp(req);
    const now = Date.now();
    const rec = fails.get(ip);
    if (rec && rec.lockedUntil > now) {
      return json({ ok: false, error: "失敗が続いたため、15分間ロックしています。時間をおいてください。" }, 429);
    }

    const raw = await readJsonBody(req, 50_000);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return json({ ok: false, error: "送信内容を読み取れませんでした" }, 400);
    }
    const body = raw as Record<string, unknown>;
    const given = typeof body.passcode === "string" ? body.passcode : "";

    if (!safeEqual(given, expected)) {
      const count = (rec && rec.lockedUntil <= now && rec.count < MAX_FAILS ? rec.count : 0) + 1;
      if (count >= MAX_FAILS) {
        fails.set(ip, { count: 0, lockedUntil: now + LOCK_MS });
        return json({ ok: false, error: "失敗が続いたため、15分間ロックしました。" }, 429);
      }
      fails.set(ip, { count, lockedUntil: 0 });
      return json({ ok: false, error: `パスコードが違います（あと${MAX_FAILS - count}回でロック）` }, 401);
    }
    fails.delete(ip);

    const repo = getRepo();
    if (!repo) return noDbResponse();
    return await run({ body, repo });
  } catch (err) {
    return serverError(err, route);
  }
}
