/**
 * Google Sheets 実装（Sheets API v4 / サービスアカウント）。
 * 要件 §5 に従い append ベースで書き込む。読み取りは最新行優先で解決。
 *
 * 前提: スプレッドシートに以下のシートを1行目ヘッダ付きで用意しておくこと
 *   learners / sessions / responses / weakness_history / sentence_cache / api_log
 * ヘッダ列名は types.ts のフィールド名と一致させる（READMEのセットアップ手順参照）。
 */
import { JWT } from "google-auth-library";
import type {
  ApiLogRow,
  CacheRow,
  LearnerRow,
  Repository,
  ResponseRow,
  SessionRow,
  WeaknessRow,
} from "./types";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// 各シートの列順（append の順序を固定）
const COLUMNS = {
  learners: ["learner_id", "display_name", "current_level", "created_at"],
  sessions: [
    "session_id",
    "learner_id",
    "input_sentence",
    "sentence_hash",
    "identified_items",
    "root_cause",
    "started_at",
    "ended_at",
  ],
  responses: [
    "response_id",
    "session_id",
    "probe_type",
    "item_id",
    "question",
    "answer",
    "is_correct",
    "confidence",
    "quadrant",
    "answered_at",
  ],
  weakness_history: [
    "learner_id",
    "item_id",
    "status",
    "error_count",
    "last_seen",
  ],
  sentence_cache: [
    "sentence_hash",
    "sentence",
    "analysis_json",
    "verified",
    "hit_count",
  ],
  api_log: [
    "date",
    "call_type",
    "prompt_version",
    "token_in",
    "token_out",
    "cached",
  ],
} as const;

type SheetName = keyof typeof COLUMNS;

let jwt: JWT | null = null;
function client(): JWT {
  if (!jwt) {
    jwt = new JWT({
      email: EMAIL,
      key: KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
  return jwt;
}

async function token(): Promise<string> {
  const { token } = await client().getAccessToken();
  if (!token) throw new Error("failed to get Google access token");
  return token;
}

function toRow(sheet: SheetName, obj: Record<string, unknown>): string[] {
  return COLUMNS[sheet].map((c) => {
    const v = obj[c];
    return v == null ? "" : String(v);
  });
}

async function appendRow(sheet: SheetName, obj: Record<string, unknown>) {
  const t = await token();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheet}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [toRow(sheet, obj)] }),
  });
  if (!res.ok) {
    throw new Error(`Sheets append ${sheet} failed: ${res.status} ${await res.text()}`);
  }
}

async function readSheet(sheet: SheetName): Promise<Record<string, string>[]> {
  const t = await token();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheet}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) {
    throw new Error(`Sheets read ${sheet} failed: ${res.status}`);
  }
  const data = await res.json();
  const rows: string[][] = data.values ?? [];
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = r[i] ?? ""));
    return obj;
  });
}

export class SheetsRepository implements Repository {
  async ensureLearner(learner: LearnerRow): Promise<void> {
    const existing = await readSheet("learners");
    if (!existing.some((r) => r.learner_id === learner.learner_id)) {
      await appendRow("learners", learner as unknown as Record<string, unknown>);
    }
  }

  appendSession(row: SessionRow) {
    return appendRow("sessions", row as unknown as Record<string, unknown>);
  }

  appendResponse(row: ResponseRow) {
    return appendRow("responses", row as unknown as Record<string, unknown>);
  }

  upsertWeakness(row: WeaknessRow) {
    // append-based（読み取り時に最新行を採用）
    return appendRow(
      "weakness_history",
      row as unknown as Record<string, unknown>
    );
  }

  async getCache(hash: string): Promise<CacheRow | null> {
    const rows = await readSheet("sentence_cache");
    // 最新（末尾）優先
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].sentence_hash === hash) {
        const r = rows[i];
        return {
          sentence_hash: r.sentence_hash,
          sentence: r.sentence,
          analysis_json: r.analysis_json,
          verified: r.verified === "true",
          hit_count: Number(r.hit_count || 0),
        };
      }
    }
    return null;
  }

  putCache(row: CacheRow) {
    return appendRow("sentence_cache", row as unknown as Record<string, unknown>);
  }

  appendApiLog(row: ApiLogRow) {
    return appendRow("api_log", row as unknown as Record<string, unknown>);
  }
}
