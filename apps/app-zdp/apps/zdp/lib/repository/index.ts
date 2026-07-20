/**
 * Repository ファクトリ。
 * Google認証情報が揃っていれば SheetsRepository、無ければ LocalRepository。
 * 書き込み失敗はセッションを止めない（要件 §9: 可用性）。失敗は握りつぶしてログのみ。
 */
import { LocalRepository } from "./local";
import { SheetsRepository } from "./sheets";
import type { ApiLogRow, Repository } from "./types";

export * from "./types";

let repo: Repository | null = null;

export function hasSheetsConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEETS_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
  );
}

export function getRepository(): Repository {
  if (repo) return repo;
  repo = hasSheetsConfig() ? new SheetsRepository() : new LocalRepository();
  return repo;
}

export function storageMode(): "sheets" | "local" {
  return hasSheetsConfig() ? "sheets" : "local";
}

/** 書き込みを安全に実行（失敗してもthrowしない） */
export async function safeWrite(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error("[repository] write failed (non-fatal):", e);
  }
}

/** API使用量ログ（gemini.ts から呼ばれる） */
export async function logApiCall(row: ApiLogRow): Promise<void> {
  await safeWrite(() => getRepository().appendApiLog(row));
}
