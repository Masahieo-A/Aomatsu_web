// API ルート共通の小さな道具。サーバー専用（クライアントから import しない）。
import type { ApiResult, Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/content";
import type { Repo } from "./db";

export const NO_DB_MESSAGE = "共有DBが未設定です（端末内にのみ保存されます）";
export const SERVER_ERROR_MESSAGE = "サーバーでエラーが起きました。しばらくしてからやり直してください。";

export function json<T>(body: ApiResult<T>, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function noDbResponse(): Response {
  return json({ ok: false, noDb: true, error: NO_DB_MESSAGE });
}

/** 内部エラーはサーバーログにだけ残し、利用者にはスタックを返さない */
export function serverError(err: unknown, where: string): Response {
  console.error(`[${where}]`, err instanceof Error ? err.message : "unknown error");
  return json({ ok: false, error: SERVER_ERROR_MESSAGE }, 500);
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** JSON 本文を読む。壊れている・大きすぎる場合は undefined */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown | undefined> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// 設定は生徒の送信のたびに参照するため、短時間だけメモリに持つ
const SETTINGS_TTL_MS = 30_000;
let settingsCache: { value: Settings; at: number } | null = null;

export function invalidateSettingsCache() {
  settingsCache = null;
}

export async function loadSettings(repo: Repo | null): Promise<Settings> {
  if (!repo) return DEFAULT_SETTINGS;
  const now = Date.now();
  if (settingsCache && now - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.value;
  const stored = await repo.getSettings();
  const value: Settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  settingsCache = { value, at: now };
  return value;
}
