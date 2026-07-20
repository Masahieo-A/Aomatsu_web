import { google, type sheets_v4 } from "googleapis";
import { TABLE_NAMES, type TableName, type TableRowMap } from "@/types";
import type { StorageAdapter } from "./adapter";

/**
 * Google Sheets ドライバ（要件定義 §6・Phase 3）。
 * - スプレッドシートのタブ＝テーブル。起動時に無ければヘッダー行つきで自動作成
 * - 読み取りはタブ全体を一括取得してメモリ上でフィルタ（クォータ節約）
 * - 複雑な構造（analysis, anchor, gate1〜3）はセル内JSON文字列
 * - トランザクションなし（利用者は教員1人）
 */

// 各テーブルの列定義（ヘッダー行と直列化方法）
type ColumnKind = "string" | "number" | "boolean" | "json";

const TABLE_COLUMNS: Record<TableName, [string, ColumnKind][]> = {
  assignments: [
    ["assignment_id", "string"],
    ["title", "string"],
    ["mode", "string"],
    ["question_count", "number"],
    ["created_at", "string"],
  ],
  submissions: [
    ["submission_id", "string"],
    ["assignment_id", "string"],
    ["student_label", "string"],
    ["text", "string"],
    ["status", "string"],
    ["analysis", "json"],
  ],
  questions: [
    ["question_id", "string"],
    ["submission_id", "string"],
    ["type", "number"],
    ["anchor", "json"],
    ["question_text", "string"],
    ["model_answer", "string"],
    ["acceptable_conditions", "string"],
    ["typical_wrong", "string"],
    ["scoring_steps", "string"],
    ["difficulty_score", "number"],
    ["gate1", "json"],
    ["gate2", "json"],
    ["gate3", "json"],
    ["status", "string"],
    ["prompt_version", "string"],
    ["model_id", "string"],
    ["edited", "boolean"],
  ],
  results: [
    ["question_id", "string"],
    ["student_label", "string"],
    ["score", "number"],
    ["scored_at", "string"],
  ],
};

function serializeCell(value: unknown, kind: ColumnKind): string {
  if (value === null || value === undefined) return "";
  switch (kind) {
    case "json":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    default:
      return String(value);
  }
}

function deserializeCell(raw: string | undefined, kind: ColumnKind): unknown {
  const cell = raw ?? "";
  if (cell === "") {
    return kind === "boolean" ? undefined : kind === "json" ? null : kind === "number" ? 0 : "";
  }
  switch (kind) {
    case "json":
      try {
        return JSON.parse(cell);
      } catch {
        return null;
      }
    case "number":
      return Number(cell);
    case "boolean":
      return cell === "true";
    default:
      return cell;
  }
}

export class SheetsStorageAdapter implements StorageAdapter {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private initialized = false;
  // 書き込みの直列化（行番号のずれ防止）
  private writeLock: Promise<void> = Promise.resolve();

  constructor(keyPath: string, spreadsheetId: string) {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = spreadsheetId;
  }

  /** タブが無ければヘッダー行つきで自動作成（要件定義 §5） */
  private async ensureTabs(): Promise<void> {
    if (this.initialized) return;
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const existing = new Set(
      (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "")
    );
    for (const table of TABLE_NAMES) {
      if (existing.has(table)) continue;
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: table } } }],
        },
      });
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${table}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [TABLE_COLUMNS[table].map(([name]) => name)],
        },
      });
    }
    this.initialized = true;
  }

  /** タブ全体を一括取得して行オブジェクトへ変換 */
  private async readAll<T extends TableName>(
    table: T
  ): Promise<{ rows: TableRowMap[T][]; rowNumbers: number[] }> {
    await this.ensureTabs();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: table,
    });
    const values = res.data.values ?? [];
    const columns = TABLE_COLUMNS[table];
    const rows: TableRowMap[T][] = [];
    const rowNumbers: number[] = [];
    // 1行目はヘッダー
    for (let i = 1; i < values.length; i++) {
      const raw = values[i] as string[];
      if (raw.every((c) => (c ?? "") === "")) continue;
      const obj: Record<string, unknown> = {};
      columns.forEach(([name, kind], col) => {
        const value = deserializeCell(raw[col], kind);
        if (value !== undefined) obj[name] = value;
      });
      rows.push(obj as TableRowMap[T]);
      rowNumbers.push(i + 1); // シート上の実行番号（1始まり）
    }
    return { rows, rowNumbers };
  }

  private withLock(fn: () => Promise<void>): Promise<void> {
    const next = this.writeLock.then(fn, fn);
    this.writeLock = next;
    return next;
  }

  async list<T extends TableName>(
    table: T,
    filter?: Partial<TableRowMap[T]>
  ): Promise<TableRowMap[T][]> {
    const { rows } = await this.readAll(table);
    if (!filter) return rows;
    const entries = Object.entries(filter);
    return rows.filter((row) =>
      entries.every(
        ([key, value]) => (row as Record<string, unknown>)[key] === value
      )
    );
  }

  async insert<T extends TableName>(
    table: T,
    rows: TableRowMap[T][]
  ): Promise<void> {
    if (rows.length === 0) return;
    return this.withLock(async () => {
      await this.ensureTabs();
      const columns = TABLE_COLUMNS[table];
      const values = rows.map((row) =>
        columns.map(([name, kind]) =>
          serializeCell((row as Record<string, unknown>)[name], kind)
        )
      );
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: table,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    });
  }

  async update<T extends TableName>(
    table: T,
    idColumn: keyof TableRowMap[T] & string,
    id: string,
    patch: Partial<TableRowMap[T]>
  ): Promise<void> {
    return this.withLock(async () => {
      const { rows, rowNumbers } = await this.readAll(table);
      const index = rows.findIndex(
        (row) => (row as Record<string, unknown>)[idColumn] === id
      );
      if (index === -1) {
        throw new Error(`${table}.${idColumn}=${id} が見つかりません`);
      }
      const merged = { ...rows[index], ...patch } as Record<string, unknown>;
      const columns = TABLE_COLUMNS[table];
      const rowValues = columns.map(([name, kind]) =>
        serializeCell(merged[name], kind)
      );
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${table}!A${rowNumbers[index]}`,
        valueInputOption: "RAW",
        requestBody: { values: [rowValues] },
      });
    });
  }
}
